import jsonwebtoken from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const PRIV_KEY = process.env.PRIV_ACCESS_KEY;

/**
 * @param {*} user - The user object.  We need this to set the JWT `sub` payload property to the MongoDB user ID
 */

const issueAccessToken = (user: User, isNewLogin: boolean) => {
  const {
    _id,
    username,
    email,
    first_name,
    last_name,
    is_admin,
    is_verified_author,
  } = user;

  const flag = isNewLogin ? 'login' : 'refresh';

  // Access token has a lifetime of 10mins
  const expiresIn = '10mins';

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
    flag,
  };

  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, {
    expiresIn: expiresIn,
    algorithm: 'RS256',
  });

  return signedToken;
};

export default issueAccessToken;
