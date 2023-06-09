import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import User from '../models/user';
import createError from 'http-errors';

dotenv.config();

const PUB_KEY = process.env.PUB_KEY;

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
) =>
  passport.authenticate(
    'jwt',
    { session: false },
    (
      err: any,
      user: Express.User | false | null,
      info: object | string | Array<string | undefined>,
    ) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.status(404).json({ error: 'Unable to find user', success: false });
      } else {
        next();
      }
    },
  )(req, res, next);

export const retrieveUserFromJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!(req.headers && req.headers.authorization)) {
      const err = new Error('Unauthorized');
      return next(err);
    }

    // Retrieve token from authorization header
    const token = req.headers.authorization.split(' ')[1];

    // Check if the token matches the supposed origin
    const decodedToken = jwt.verify(token, PUB_KEY);

    // Find user in database
    const user = await User.findById(decodedToken.sub, {
      _id: 1,
      username: 1,
      email: 1,
      first_name: 1,
      last_name: 1,
      isAdmin: 1,
    });

    if (user !== null) {
      // Pass the user to the endpoints
      req.user = user;
      next();
    } else {
      createError(404, 'Unable to find user');
    }
  },
);
