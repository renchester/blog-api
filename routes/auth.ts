import express from 'express';
import passport from 'passport';
import { issueJWT } from '../utils/passwordUtils';

const router = express.Router();

// Login Route

router.post(
  '/login',
  passport.authenticate('local', {
    session: false,
    failureRedirect: '/auth/login-failure',
  }),
  (req, res, next) => {
    const user = req.user as User;
    const tokenObject = issueJWT(user);
    res.json({
      success: true,
      user,
      token: tokenObject.token,
      expiresIn: tokenObject.expires,
    });
  },
);

router.get('/login-failure', (req, res) => {
  res.status(401).json({
    error: 'Failed to login',
  });
});

export default router;
