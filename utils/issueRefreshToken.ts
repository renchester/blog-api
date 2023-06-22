import jsonwebtoken from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const PRIV_KEY = process.env.PRIV_REFRESH_KEY;

/**
 * @param {*} user - The user object.  We need this to set the JWT `sub` payload property to the MongoDB user ID
 */

const issueRefreshToken = (user: User) => {
  const {
    _id,
    username,
    email,
    first_name,
    last_name,
    is_admin,
    is_verified_author,
  } = user;

  // Refresh token has a lifetime of 30days
  const expiresIn = '30d';

  const payload = {
    sub: _id,
    user: {
      _id,
      username,
      email,
      first_name,
      last_name,
      is_admin,
      is_verified_author,
    },
  };

  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, {
    expiresIn: expiresIn,
    algorithm: 'RS256',
  });

  return signedToken;
};

export default issueRefreshToken;
