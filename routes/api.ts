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
router.get('/users', userController.get_users);

// POST request for creating new user
router.post('/users', userController.create_user);

// GET request for a specific user
router.get('/users/:id', userController.get_user_by_id);

// PUT request for updating user details
router.put('/users/:id', userController.update_details);

// PATCH request for updating user password
router.patch('/users/:id', userController.update_password);

// DELETE request for deleting user
router.delete('/users/:id', userController.delete_user);

export default router;
