import dotenv from 'dotenv';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from 'passport-jwt';
import User from '../models/user';
import { PassportStatic } from 'passport';

dotenv.config();

const PUB_ACCESS_KEY = process.env.PUB_ACCESS_KEY;

const options: StrategyOptions = {
  // Format --> Bearer <Token>
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: PUB_ACCESS_KEY,
  algorithms: ['RS256'],
};

const strategy = new JwtStrategy(options, async (payload, done) => {
  try {
    const userId = payload.sub;

    const user = await User.findById(userId);

    // JWT is already validated, check if user is in database and return to passport
    // Passport JWT takes the jwt from the header and validates it with the jsonwebtoken library
    if (user) {
      return done(null, user);
    } else {
      return done(null, false, { message: 'Unable to find user' });
    }
  } catch (err) {
    done(err, false, { message: 'Authentication failed' });
  }
});

export default function (passport: PassportStatic) {
  passport.use(strategy);
}
