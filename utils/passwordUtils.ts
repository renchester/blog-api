import crypto from 'crypto';
import jsonwebtoken from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const PRIV_KEY = process.env.PRIV_KEY;

/**
 *
 * @param {*} password - The password string that the user inputs to the password field in the register form
 *
 * This function takes a plain text password and creates a salt and hash out of it.  Instead of storing the plaintext
 * password in the database, the salt and hash are stored for security
 *
 * ALTERNATIVE: It would also be acceptable to just use a hashing algorithm to make a hash of the plain text password.
 * You would then store the hashed password in the database and then re-hash it to verify later (similar to what we do here)
 */

export const genPassword = (password: string) => {
  const salt = crypto.randomBytes(32).toString('hex');
  const genHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');

  return {
    salt: salt,
    hash: genHash,
  };
};

/**
 *
 * @param {*} password - The plain text password
 * @param {*} hash - The hash stored in the database
 * @param {*} salt - The salt stored in the database
 *
 * This function uses the crypto library to decrypt the hash using the salt and then compares
 * the decrypted hash/salt with the password that the user provided at login
 */

export const checkPasswordValidity = (
  password: string,
  hash: string,
  salt: string,
) => {
  const hashVerification = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');

  return hash === hashVerification;
};

/**
 * @param {*} user - The user object.  We need this to set the JWT `sub` payload property to the MongoDB user ID
 */

export const issueJWT = (user: User) => {
  const _id = user._id;

  const expiresIn = '1d';

  const payload = {
    sub: _id,
    iat: Date.now(),
  };

  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, {
    expiresIn: expiresIn,
    algorithm: 'RS256',
  });

  return {
    token: 'Bearer ' + signedToken,
    expires: expiresIn,
  };
};
