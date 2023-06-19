import asyncHandler from 'express-async-handler';
import passport from 'passport';
import createError from 'http-errors';
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';

import UserModel from '../models/user';
import issueAccessToken from '../utils/issueAccessToken';
import issueRefreshToken from '../utils/issueRefreshToken';
import tokenOptions from '../config/refreshTokenOptions';

dotenv.config();

const PUB_REFRESH_KEY = process.env.PUB_REFRESH_KEY;

const authController = (() => {
  const handle_login = [
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
  ];

  const handle_refresh = [
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

      // Token is in DB
      next();
    }),

    // Check token expiration
    asyncHandler(async (req, res, next) => {
      const refreshToken = req.cookies.jwt;

      const decodedToken = jwt.verify(refreshToken, PUB_REFRESH_KEY, {
        ignoreExpiration: true,
      }) as JwtPayload;

      // Check if token is expired
      if (decodedToken.exp && decodedToken.exp < Date.now() / 1000) {
        // Remove token from db if expired
        await UserModel.findOneAndUpdate(
          { tokens: [refreshToken] },
          { $pull: { tokens: refreshToken } },
          { returnDocument: 'after' },
        );

        // Clear cookie from response
        res.clearCookie('jwt', tokenOptions);

        const err = createError(403, 'Token is expired');
        return next(err);
      }

      // If JWT is not expired yet
      next();
    }),

    // Issue new token
    (req: Request, res: Response, next: NextFunction) => {
      const refreshToken = req.cookies.jwt;

      try {
        // Verify the refresh token, throws error is invalid
        const decodedToken = jwt.verify(
          refreshToken,
          PUB_REFRESH_KEY,
        ) as JwtPayload;

        // Get new token if refreshToken is verified
        const accessToken = issueAccessToken(decodedToken.user, false);

        res.json({
          success: true,
          accessToken,
        });
      } catch (error) {
        res.status(403).json({ error: 'Refresh token has been revoked' });
      }
    },
  ];

  const handle_logout = asyncHandler(async (req, res, next) => {
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
  });

  return {
    handle_login,
    handle_refresh,
    handle_logout,
  };
})();

export default authController;
