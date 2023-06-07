import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';

import User from '../models/user';
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
  // Return list of all existing users in database
  const get_users = asyncHandler(async (req: Request, res: Response) => {
    const allUsers = await User.find({}).populate('posts').exec();
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
        posts: [],
      });
      if (!errors.isEmpty()) {
        // There are errors. Return error message
        res.status(400).json({ error: errors.array()[0].msg });
      } else {
        const newUser = await user.save();
        res.status(201).location(`/api/users/${newUser._id}`).json({
          success: true,
          message: `Successfully created user`,
          user,
        });
      }
    }),
  ];

  const get_user_by_id = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = await User.findById(req.params.id);

      if (user === null) {
        const err: ResponseError = new Error('User not found');
        err.status = 404;
        return next(err);
      }

      res.json({ user });
    },
  );

  const update_details = [
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
        const err: ResponseError = new Error('User not found');
        err.status = 404;
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
        posts: user.posts,
      });

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        res.status(400).json({ error: errors.array()[0].msg });
      } else {
        // Data is valid. Update the record.
        await User.findByIdAndUpdate(req.params.id, updatedUser, {});

        res.json({
          success: true,
          message: `Successfully updated user details`,
          updatedUser,
        });
      }
    }),
  ];

  const update_password = [
    // Check if old password matches
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const user = await User.findById(req.params.id);

      if (user === null) {
        const err: ResponseError = new Error('User not found');
        err.status = 404;
        return next(err);
      }

      const oldPasswordMatch = checkPasswordValidity(
        req.body.old_password,
        user.hash,
        user.salt,
      );

      if (!oldPasswordMatch) {
        res.status(400).json({
          error: 'Password does not match',
        });
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
        res.status(400).json({ error: errors.array()[0].msg });
      } else {
        // No errors. Update record and return new user.
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { hash, salt },
          { returnDocument: 'after' },
        );

        res.json({
          success: true,
          message: `Successfully updated password`,
          user,
        });
      }
    }),
  ];

  const delete_user = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await User.findByIdAndDelete(req.params.id);

      if (result) {
        res.status(204);
      } else {
        res.status(500).json({ error: 'Failed to delete user' });
      }
    },
  );

  return {
    get_users,
    create_user,
    get_user_by_id,
    update_details,
    update_password,
    delete_user,
  };
})();

export default userController;
