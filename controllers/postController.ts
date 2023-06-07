import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import { unescape } from 'querystring';

import BlogPost from '../models/blogPost';

const postController = (() => {
  // Return list of all posts in database
  const get_posts = asyncHandler(async (req, res, next) => {
    const allPosts = await BlogPost.find({})
      .populate('author')
      .populate('editors')
      .populate('liked_by')
      .populate('tags')
      .exec();

    res.json({ posts: allPosts });
  });

  const create_post = [
    // Validate and sanitize fields
    body('title', 'Title must not be empty').trim().notEmpty().escape(),
    body('content', 'Content must not be empty').trim().notEmpty().escape(),

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
      // Extract validation errors from request
      const errors = validationResult(req);

      // Create new Post object with escaped data
      // const blogPost = new BlogPost({});
      res.json({ success: true });
    }),
  ];

  const get_post_by_id = asyncHandler(async (req, res, next) => {});

  const edit_post = asyncHandler(async (req, res, next) => {});

  const get_post_comments = asyncHandler(async (req, res, next) => {});

  const delete_post = asyncHandler(async (req, res, next) => {});

  return {
    get_posts,
    create_post,
    get_post_by_id,
    edit_post,
    get_post_comments,
    delete_post,
  };
})();

export default postController;
