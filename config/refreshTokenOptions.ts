import { CookieOptions } from 'express';
import dotenv from 'dotenv';
dotenv.config();

const tokenOptions: CookieOptions = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  secure: true,
  sameSite: 'none',
};

export default tokenOptions;
