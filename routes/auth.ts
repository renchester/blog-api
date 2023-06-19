import express from 'express';
import asyncHandler from 'express-async-handler';
import passport from 'passport';
import createError from 'http-errors';
import issueAccessToken from '../utils/issueAccessToken';
import issueRefreshToken from '../utils/issueRefreshToken';
import { issueNewToken } from '../lib/authHandlers';

import UserModel from '../models/user';
import tokenOptions from '../config/refreshTokenOptions';

const router = express.Router();

// Login Route

router.post(
  '/login',
  passport.authenticate('local', {
    session: false,
    failureRedirect: '/auth/login-failure',
  }),
  asyncHandler(async (req, res, next) => {
    const user = req.user as User;
    const appUser = {
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      _id: user._id,
      admin: user.admin,
    };

    // Issue access and refresh token to new logged in user
    const accessToken = issueAccessToken(user, true);
    const refreshToken = issueRefreshToken(user);

    // Add refresh token to user model
    await UserModel.findByIdAndUpdate(user._id, {
      $push: { tokens: refreshToken },
    });

    // Send refresh token inside an httpOnly cookie
    res.cookie('jwt', refreshToken, tokenOptions);

    // Send access token to be stored in app memory
    res.json({
      success: true,
      user: appUser,
      accessToken,
    });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res, next) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
      // No content
      res.status(204).end();
    }

    // Delete refresh token from database
    const userToken = cookies.jwt;

    const currentUser = await UserModel.findOneAndUpdate(
      { tokens: [userToken] },
      { $pull: { tokens: userToken } },
      { returnDocument: 'after' },
    );

    // Clear the cookie from response
    res.clearCookie('jwt', tokenOptions);

    if (!currentUser) {
      res.status(204).end();
    }

    res.status(200).json({
      success: true,
    });
  }),
);

// Client sends request to auth server to refresh the token
router.get(
  '/refresh',

  // Check if refresh token is in database
  asyncHandler(async (req, res, next) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
      res.status(401).end();
    }

    const refreshToken = cookies.jwt;

    if (!refreshToken) {
      res.status(401).end();
    }

    const isTokenInDB = await UserModel.findOne({ tokens: [refreshToken] });

    if (!isTokenInDB) {
      const err = createError(403, 'Token is expired or has been revoked');
      return next(err);
    }

    // Token is in DB and ready for issuing new one
    next();
  }),

  // Verify and issue new token
  issueNewToken,
);

router.get('/login-failure', (req, res) => {
  res.status(401).json({
    error: 'Failed to login',
  });
});

export default router;
