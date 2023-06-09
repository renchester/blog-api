import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import createError from 'http-errors';

import User from '../models/user';
import BlogPost from '../models/blogPost';
import { checkPasswordValidity, genPassword } from '../utils/passwordUtils';

const validateUsername = () =>
  body('username', 'Username must be between 6 and 30 characters')
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty')
    .isLength({ min: 6, max: 30 })
    .escape()
    .bail()
    .custom(async (username) => {
      const isUsernameTaken = await User.findOne({ username });
      if (isUsernameTaken) {
        throw new Error('Username is already in use');
      }
    });

const validateEmail = () =>
  body('email', 'Invalid email format')
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .escape()
    .bail()
    .isEmail()
    .isLength({ max: 1024 })
    .bail()
    .custom(async (email) => {
      const isEmailTaken = await User.findOne({ email });
      if (isEmailTaken) {
        throw new Error('Email is already in use');
      }
    });

const validatePassword = () =>
  body('password', 'Password must have a minimum of 6 characters')
    .notEmpty()
    .isLength({ min: 6, max: 1024 });

const validateFirstName = () =>
  body('first_name', 'First name must not be empty').trim().notEmpty().escape();

const validateLastName = () =>
  body('last_name', 'Last name must not be empty').trim().notEmpty().escape();

const userController = (() => {
  const userProjection = {
    username: 1,
    email: 1,
    first_name: 1,
    last_name: 1,
    _id: 1,
    isAdmin: 1,
  };

  // Return list of all existing users in database
  const get_users = asyncHandler(async (req: Request, res: Response) => {
    const allUsers = await User.find({}, userProjection).exec();
    res.json({ users: allUsers });
  });

  // Create a new user and save to database
  const create_user = [
    // Validate and sanitize fields
    validateUsername(),
    validateEmail(),
    validatePassword(),
    validateFirstName(),
    validateLastName(),
    // Process request after validation and sanitization
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);
      // Create a hash and salt of the password
      const { salt, hash } = genPassword(req.body.password);
      // Create a User object with escaped and trimmed data
      const user = new User({
        username: req.body.username,
        email: req.body.email,
        hash: hash,
        salt: salt,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
      });
      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        const newUser = await user.save();
        res
          .status(201)
          .location(`/api/users/${newUser._id}`)
          .json({
            success: true,
            message: `Successfully created user`,
            user,
            link: `/api/users/${newUser._id}`,
          });
      }
    }),
  ];

  const get_user_by_id = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = await User.findById(req.params.id, userProjection);

      if (user === null) {
        const err = createError(400, 'User not found');
        return next(err);
      }

      res.json({ user });
    },
  );

  const update_details = [
    // Check if current user has authorization to edit user details
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Find user to be updated
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        const err = createError(404, 'Unable to find user');
        return next(err);
      }

      // Check if target user is also the current user
      const isUser = targetUser._id === req.user?._id;

      if (isUser) {
        const err = createError(401, 'Unauthorized to edit user details');
        return next(err);
      } else {
        next();
      }
    }),

    // Validate and sanitize fields
    validateUsername(),
    validateEmail(),
    validateFirstName(),
    validateLastName(),

    // Process request after validation and sanitization
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      // Get user data
      const user = await User.findById(req.params.id);

      if (user === null) {
        const err = createError(400, 'User not found');
        return next(err);
      }

      const updatedUser = new User({
        _id: req.params.id, // Assign the old id
        username: req.body.username,
        email: req.body.email,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        salt: user.salt,
        hash: user.hash,
      });

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        // Data is valid. Update the record.
        const user = await User.findByIdAndUpdate(req.params.id, updatedUser, {
          runValidators: true,
        });

        res.location(`/api/users/${user?._id}`).json({
          success: true,
          message: `Successfully updated user details`,
          user: user,
          link: `/api/users/${req.params.id}`,
        });
      }
    }),
  ];

  const update_password = [
    // Check if current user has authorization to edit user password
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Find user to be updated
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        const err = createError(404, 'Unable to find user');
        return next(err);
      }

      // Check if target user is also the current user
      const isUser = targetUser._id === req.user?._id;

      if (isUser) {
        const err = createError(
          401,
          "Unauthorized to edit this user's password",
        );
        return next(err);
      } else {
        next();
      }
    }),

    // Check if old password matches
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const user = await User.findById(req.params.id);

      if (user === null) {
        const err = createError(400, 'User not found');
        return next(err);
      }

      const oldPasswordMatch = checkPasswordValidity(
        req.body.old_password,
        user.hash,
        user.salt,
      );

      if (!oldPasswordMatch) {
        const err = createError(400, 'Password does not match');
        return next(err);
      } else {
        next();
      }
    }),

    // Validate new password
    validatePassword(),

    // Process request after password validation
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      // Create a hash and salt of the new password
      const { salt, hash } = genPassword(req.body.password);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        // No errors. Update record and return new user.
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { hash, salt },
          { runValidators: true },
        );

        res.location(`/api/users/${req.params.id}`).json({
          success: true,
          message: `Successfully updated password`,
          user,
          link: `/api/users/${req.params.id}`,
        });
      }
    }),
  ];

  const delete_user = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // Check if user is admin (has authorization to delete users)
      const isAdmin = req.user?.isAdmin;

      if (!isAdmin) {
        const err = createError(401, 'Unauthorized to delete user');
        return next(err);
      }

      // User is admin. Delete record
      const result = await User.findByIdAndDelete(req.params.id);

      // Delete all posts from user
      await BlogPost.deleteMany({ author: { _id: result?._id } });

      // Delete all comments from user
      await BlogPost.updateMany(
        {},
        { comments: { $pull: { author: { _id: result?._id } } } },
      );

      if (result) {
        res.status(204).end();
      } else {
        const err = createError(500, 'Failed to delete user');
        return next(err);
      }
    },
  );

  const get_user_posts = asyncHandler(async (req, res, next) => {
    const posts = await BlogPost.find({
      author: { _id: req.params.id },
    })
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
      .populate('tags')
      .exec();

    res.json({ posts });
  });

  return {
    get_users,
    create_user,
    get_user_by_id,
    update_details,
    update_password,
    delete_user,
    get_user_posts,
  };
})();

export default userController;
