import passport from 'passport';
import { Strategy as LocalStrategy, VerifyFunction } from 'passport-local';
import { checkPasswordValidity } from '../utils/passwordUtils';

import User from '../models/user';

const verifyCallback: VerifyFunction = async (username, password, cb) => {
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return cb(null, false, { message: 'Incorrect username' });
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
    cb(error);
  }
};

const strategy = new LocalStrategy(verifyCallback);

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
