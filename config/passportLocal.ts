import passport from 'passport';
import { Strategy as LocalStrategy, VerifyFunction } from 'passport-local';
import { checkPasswordValidity } from '../utils/passwordUtils';

import User from '../models/user';

const verifyCallback: VerifyFunction = async (email, password, cb) => {
  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return cb(null, false, { message: 'Incorrect email' });
    }

    const isPasswordValid = checkPasswordValidity(
      password,
      user.hash,
      user.salt,
    );

    if (isPasswordValid) {
      return cb(null, user);
    } else {
      return cb(null, false, { message: 'Incorrect password' });
    }
  } catch (error) {
    cb(error, false, { message: 'Authentication failed' });
  }
};

const strategy = new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  verifyCallback,
);

passport.use(strategy);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await User.findById(userId);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
