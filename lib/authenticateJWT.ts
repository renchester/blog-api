import passport from 'passport';
import { NextFunction, Request, Response } from 'express';

const authenticateJWT = (req: Request, res: Response, next: NextFunction) =>
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
        res.status(401).json({ error: 'User not found' });
      } else {
        next();
      }
    },
  )(req, res, next);

export default authenticateJWT;
