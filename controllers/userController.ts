import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import createError from 'http-errors';

import userProjection from '../config/projections/userProjection';
import User from '../models/user';
import BlogPost from '../models/blogPost';
import { checkPasswordValidity, genPassword } from '../utils/passwordUtils';

const checkAdminAuthorization = () =>
  asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
      const err = createError(401);
      return next(err);
    }

    if (!user.is_admin) {
      const err = createError(403);
      return next(err);
    }

    next();
  });

const checkAuthorization = () =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Find user to be updated
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      const err = createError(404, 'Unable to find user');
      return next(err);
    }

    // Check if target user is also the current user
    const isUser = req.user?._id.equals(targetUser._id);

    if (!isUser) {
      const err = createError(403, 'Unauthorized to edit this field');
      return next(err);
    } else {
      next();
    }
  });

const validateUsername = () =>
  body('username', 'Username must be between 6 and 30 characters')
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty')
    .isLength({ min: 6, max: 30 })
    .escape();

const validateEmail = () =>
  body('email', 'Invalid email format')
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .escape()
    .bail()
    .isEmail()
    .isLength({ max: 1024 });

const validatePassword = () =>
  body('password', 'Password must have a minimum of 6 characters')
    .notEmpty()
    .isLength({ min: 6, max: 1024 });

const validateFirstName = () =>
  body('first_name', 'First name must not be empty').trim().notEmpty().escape();

const validateLastName = () =>
  body('last_name', 'Last name must not be empty').trim().notEmpty().escape();

const userController = (() => {
  // Return list of all existing users in database
  const get_users = [
    // Query handler
    asyncHandler(async (req, res, next) => {
      const { username, email } = req.query;

      if (username) {
        const user = await User.findOne({ username }, userProjection).exec();

        if (!user) {
          const err = createError(404, 'Unable to find user');
          return next(err);
        }

        res.json({
          user,
          success: true,
          _links: {
            self: `/api/users/${user._id}`,
          },
        });
      }

      if (email) {
        const user = await User.findOne({ email }, userProjection).exec();

        if (!user) {
          const err = createError(404, 'Unable to find user');
          return next(err);
        }

        res.json({
          user,
          success: true,
          _links: {
            self: `/api/users/${user._id}`,
          },
        });
      }

      next();
    }),

    checkAdminAuthorization(),

    // Get all users
    asyncHandler(async (req: Request, res: Response) => {
      const allUsers = await User.find({}, userProjection).exec();

      res.json({
        users: allUsers,
        success: true,
      });
    }),
  ];

  // Create a new user and save to database
  const create_user = [
    // Validate and sanitize fields
    validateUsername()
      .bail()
      .custom(async (username) => {
        const isUsernameTaken = await User.findOne({ username });
        if (isUsernameTaken) {
          createError(409, 'Username is already in use');
        }
      }),
    validateEmail()
      .bail()
      .custom(async (email) => {
        const isEmailTaken = await User.findOne({ email });
        if (isEmailTaken) {
          createError(409, 'Email is already in use');
        }
      }),
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
            _links: {
              self: `/api/users/${newUser._id}`,
            },
          });
      }
    }),
  ];

  const get_user_by_id = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = await User.findById(req.params.id, userProjection);

      if (!user) {
        const err = createError(404, 'User not found');
        return next(err);
      }

      res.json({
        user,
        success: true,
        _links: {
          self: `/api/users/${user._id}`,
        },
      });
    },
  );

  const update_details = [
    // Check if current user has authorization to edit user details
    checkAuthorization(),

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

      if (!user) {
        const err = createError(404, 'User not found');
        return next(err);
      }

      const updatedUser = new User<User>({
        ...user,
        username: req.body.username,
        email: req.body.email,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
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
          _links: {
            self: `/api/users/${req.params.id}`,
          },
        });
      }
    }),
  ];

  const update_first_name = [
    // Check if current user has authorization to edit user first name
    checkAuthorization(),

    // Validate first name
    validateFirstName(),

    // Process request after validation
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        // No errors. Update record and return new user.
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { first_name: req.body.first_name },
          { runValidators: true, returnDocument: 'after' },
        );

        res.location(`/api/users/${req.params.id}`).json({
          success: true,
          message: `Successfully updated first name`,
          _links: {
            self: `/api/users/${req.params.id}`,
          },
        });
      }
    }),
  ];

  const update_last_name = [
    // Check if current user has authorization to edit user last name
    checkAuthorization(),

    // Validate last name
    validateLastName(),

    // Process request after validation
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        // No errors. Update record and return new user.
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { last_name: req.body.last_name },
          { runValidators: true, returnDocument: 'after' },
        );

        res.location(`/api/users/${req.params.id}`).json({
          success: true,
          message: `Successfully updated last name`,
          _links: {
            self: `/api/users/${req.params.id}`,
          },
        });
      }
    }),
  ];

  const update_username = [
    // Check if current user has authorization to edit username
    checkAuthorization(),

    // Validate username
    validateUsername(),

    // Process request after validation
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        // No errors. Update record and return new user.
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { username: req.body.username },
          { runValidators: true, returnDocument: 'after' },
        );

        res.location(`/api/users/${req.params.id}`).json({
          success: true,
          message: `Successfully updated username`,
          _links: {
            self: `/api/users/${req.params.id}`,
          },
        });
      }
    }),
  ];

  const update_email = [
    // Check if current user has authorization to edit user email
    checkAuthorization(),

    // Validate last name
    validateEmail(),

    // Process request after validation
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        // No errors. Update record and return new user.
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { email: req.body.email },
          { runValidators: true, returnDocument: 'after' },
        );

        res.location(`/api/users/${req.params.id}`).json({
          success: true,
          message: `Successfully updated email`,
          _links: {
            self: `/api/users/${req.params.id}`,
          },
        });
      }
    }),
  ];

  const update_password = [
    // Check if current user has authorization to edit user password
    checkAuthorization(),

    // Validate old password
    body('old_password', 'Password must have a minimum of 6 characters')
      .notEmpty()
      .isLength({ min: 6, max: 1024 }),

    // Validate new password
    validatePassword(),

    // Check if old password matches
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const user = await User.findById(req.params.id);

      if (!user) {
        const err = createError(404, 'User not found');
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
          { runValidators: true, returnDocument: 'after' },
        );

        res.location(`/api/users/${req.params.id}`).json({
          success: true,
          message: `Successfully updated password`,
          _links: {
            self: `/api/users/${req.params.id}`,
          },
        });
      }
    }),
  ];

  const delete_user = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // Check if user is admin (has authorization to delete users)
      const isAdmin = req.user?.is_admin;

      if (!isAdmin) {
        const err = createError(403, 'Unauthorized to delete user');
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
    const posts = await BlogPost.find(
      {
        author: { _id: req.params.id },
      },
      { __v: 0 },
    )
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
      .populate('tags', { __v: 0 })
      .exec();

    res.json({
      posts,
      success: true,
      _links: {
        user: `/api/users/${req.params.id}`,
      },
    });
  });

  return {
    get_users,
    create_user,
    get_user_by_id,
    update_details,
    update_first_name,
    update_last_name,
    update_username,
    update_email,
    update_password,
    delete_user,
    get_user_posts,
  };
})();

export default userController;
