import express, { Request, Response } from 'express';

import userController from '../controllers/userController';
import postController from '../controllers/postController';
import tagController from '../controllers/tagController';
import commentController from '../controllers/commentController';
import { authenticateJWT, retrieveUserFromJWT } from '../lib/authMiddleware';

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

// PATCH request for updating user first name
router.patch(
  '/users/:id/first_name',
  authenticateJWT,
  retrieveUserFromJWT,
  userController.update_first_name,
);

// PATCH request for updating user last name
router.patch(
  '/users/:id/last_name',
  authenticateJWT,
  retrieveUserFromJWT,
  userController.update_last_name,
);

// PATCH request for updating username
router.patch(
  '/users/:id/username',
  authenticateJWT,
  retrieveUserFromJWT,
  userController.update_username,
);

// PATCH request for updating user email
router.patch(
  '/users/:id/email',
  authenticateJWT,
  retrieveUserFromJWT,
  userController.update_email,
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

// GET request to retrieve posts by user
router.get('/users/:id/posts', userController.get_user_posts);

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

// GET request to retrieve 10 newest posts
router.get('/posts/new', postController.get_newest_posts);

// GET request to retrieve posts by tagname
router.get('/posts/tag/:tagname', postController.get_posts_by_tagname);

// GET request to retrive posts by category
router.get('/posts/category/:category', postController.get_posts_by_category);

// GET request to retrieve post
router.get('/posts/:slug', postController.get_post_by_slug);

// PATCH request to update post body
router.patch(
  '/posts/:id/content',
  authenticateJWT,
  retrieveUserFromJWT,
  postController.edit_post,
);

// PATCH request to update post privacy
router.patch(
  '/posts/:id/content',
  authenticateJWT,
  retrieveUserFromJWT,
  postController.edit_privacy,
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
  '/posts/:postid/comments/:commentid',
  commentController.get_comment_by_id,
);

// PATCH request to update comment body
router.patch(
  '/posts/:postid/comments/:commentid',
  authenticateJWT,
  retrieveUserFromJWT,
  commentController.edit_comment,
);

// GET request to get comment likes
router.get(
  '/posts/:postid/comments/:commentid/likes',
  authenticateJWT,
  retrieveUserFromJWT,
  commentController.get_comment_likes,
);

// POST request to add a like to comment
router.post(
  '/posts/:postid/comments/:commentid/likes',
  authenticateJWT,
  retrieveUserFromJWT,
  commentController.add_comment_like,
);

// DELETE request to remove a like in comment
router.delete(
  '/posts/:postid/comments/:commentid/likes',
  authenticateJWT,
  retrieveUserFromJWT,
  commentController.remove_comment_like,
);

// DELETE request to delete comment
router.delete(
  '/posts/:postid/comments/:commentid',
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

router.delete(
  '/tags/:id',
  authenticateJWT,
  retrieveUserFromJWT,
  tagController.delete_tag,
);

router.patch(
  '/tags/:id',
  authenticateJWT,
  retrieveUserFromJWT,
  tagController.edit_tag,
);

export default router;
