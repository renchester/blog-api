import { NextFunction, Request, Response } from 'express';

// Error handling middleware for logging error messages
export const errorLogger = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log(`Error ${err.message}`);
  console.error(err.stack);
  next(err);
};

// Error handling middleware function reads the error message
// and sends back a response in JSON format
export const errorResponder = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.header('Content-Type', 'application/json');
  const status = err.status || 400;

  if (err.name === 'CastError') {
    res
      .status(status)
      .json({ error: `Invalid ${err.path}: ${err.value}`, success: false });
  }

  res
    .status(status)
    .json({ error: err.message || 'Something went wrong', success: false });
};

// Fallback middleware for returning 404 error
// for undefined paths
export const invalidPathHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.status(404).json({ error: 'Invalid Path' });
};
