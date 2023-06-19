import express from 'express';
import authController from '../controllers/authController';

const router = express.Router();

router.post('/login', authController.handle_login);

router.post('/logout', authController.handle_logout);

// Client sends request to auth server to refresh the token
router.get('/refresh', authController.handle_refresh);

router.get('/login-failure', (req, res) => {
  res.status(401).json({
    error: 'Failed to login',
  });
});

export default router;
