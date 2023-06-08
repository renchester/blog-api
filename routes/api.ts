import express, { Request, Response } from 'express';

import userController from '../controllers/userController';
import postController from '../controllers/postController';
import tagController from '../controllers/tagController';
import commentController from '../controllers/commentController';
import { authenticateJWT, retrieveUserFromJWT } from '../lib/authHandlers';

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
router.put(
  '/users/:id',
  authenticateJWT,
  retrieveUserFromJWT,
  userController.update_details,
);

// PATCH request for updating user password
router.patch(
  '/users/:id/password',
  authenticateJWT,
  retrieveUserFromJWT,
  userController.update_password,
);

// DELETE request for deleting user
router.delete(
  '/users/:id',
  authenticateJWT,
  retrieveUserFromJWT,
  userController.delete_user,
);

/**
 * ------------- POST ROUTES -------------
 */

// GET request to retrieve all posts
router.get('/posts', postController.get_posts); //include query by tag

// POST request to create new post
router.post(
  '/posts',
  authenticateJWT,
  retrieveUserFromJWT,
  postController.create_post,
);

// GET request to retrieve post
router.get('/posts/:id', postController.get_post_by_id);

// PATCH request to update post body
router.patch(
  '/posts/:id/content',
  authenticateJWT,
  retrieveUserFromJWT,
  postController.edit_post,
);

// DELETE request for deleting post
router.delete(
  '/posts/:id',
  authenticateJWT,
  retrieveUserFromJWT,
  postController.delete_post,
);

/**
 * ------------- COMMENT ROUTES -------------
 */

// GET request to retrieve post comments
router.get('/posts/:postid/comments', commentController.get_post_comments);

// POST request to add new comment
router.post(
  '/posts/:postid/comments',
  authenticateJWT,
  retrieveUserFromJWT,
  commentController.create_comment,
);

// GET request to retrieve a specific comment
router.get(
  '/posts/:postid/commens/:commentid',
  commentController.get_comment_by_id,
);

// PATCH request to update comment body
router.patch(
  '/posts/:postid/comments',
  authenticateJWT,
  retrieveUserFromJWT,
  commentController.edit_comment,
);

// DELETE request to delete comment
router.delete(
  '/posts/:postid/commens/:commentid',
  authenticateJWT,
  retrieveUserFromJWT,
  commentController.delete_comment,
);

/**
 * ------------- TAG ROUTES -------------
 */

router.get('/tags', tagController.get_tags);

router.post('/tags', tagController.create_tag);

router.get('/tags/:id', tagController.get_tag_by_id);

export default router;
