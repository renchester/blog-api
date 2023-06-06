import express, { Request, Response } from 'express';

import userController from '../controllers/userController';

const router = express.Router();

/**
 * ------------- API HOME ROUTE -------------
 */

router.get('/', (req: Request, res: Response) => {
  return res.json({ message: 'Welcome to the API' });
});

/**
 * ------------- USER ROUTES -------------
 */

// GET request for list of all users
router.get('/users', userController.user_list);

// POST request for creating new user
router.post('/users', userController.user_create);

// GET request for a specific user
router.get('/users/:id', (req: Request, res: Response) => {});

export default router;
