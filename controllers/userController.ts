import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';

import User from '../models/user';
import { genPassword } from '../utils/passwordUtils';

// export const postNewUser = asyncHandler(
//   async (req: Request, res: Response) => {},
// );

const userController = (() => {
  // Return list of all existing users in database
  const user_list = asyncHandler(async (req: Request, res: Response) => {
    const allUsers = await User.find({}).populate('posts').exec();
    res.json({ users: allUsers });
  });

  // Create a new user and save to database
  const user_create = [
    // Validate and sanitize fields
    body('username', 'Username must be between 6 and 30 characters')
      .trim()
      .isLength({ min: 6, max: 30 })
      .escape()
      .bail()
      .custom(async (username) => {
        const isUsernameTaken = await User.findOne({ username });
        if (isUsernameTaken) {
          throw new Error('Username is already in use');
        }
      }),
    body('email', 'Invalid email format')
      .trim()
      .notEmpty()
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
      }),
    body('password', 'Password must have a minimum of 6 characters')
      .notEmpty()
      .isLength({ min: 6, max: 1024 }),
    body('first_name', 'First name must not be empty')
      .trim()
      .notEmpty()
      .escape(),
    body('last_name', 'Last name must not be empty').trim().notEmpty().escape(),

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
        await user.save();

        res.status(200).json({
          success: true,
          user,
        });
      }
    }),
  ];

  return {
    user_list,
    user_create,
  };
})();

export default userController;
