import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import { unescape } from 'querystring';
import slugify from 'slugify';
import createError from 'http-errors';

import BlogPost from '../models/blogPost';

const postController = (() => {
  const userProjection = {
    first_name: 1,
    last_name: 1,
    username: 1,
    email: 1,
  };

  // Return list of all posts in database
  const get_posts = asyncHandler(async (req, res, next) => {
    const allPosts = await BlogPost.find({}, { __v: 0 })
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
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

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      }

      // Extract user from JWT
      const user = req.user;

      if (!user) {
        const err = createError(401, 'Unauthorized to create post');
        return next(err);
      } else {
        const slugifyOptions = {
          replacement: '-',
          remove: /[*+~.()'"!:@]/g,
          lower: true,
          strict: true,
          locale: 'en',
          trim: true,
        };

        // Create new Post object with escaped data
        const blogPost = new BlogPost({
          title: req.body.title,
          slug: slugify(req.body.title, slugifyOptions),
          author: user._id,
          editors: [],
          content: req.body.content,
          comments: [],
          liked_by: [],
          tags: [],
          edits: [],
        });

        const newPost = await blogPost.save();

        // Send url of new post
        res
          .status(201)
          .location(`/api/posts/${newPost._id}`)
          .json({
            success: true,
            message: 'Successfully created post',
            post: newPost,
            link: `/api/posts/${newPost._id}`,
          });
      }
    }),
  ];

  const get_post_by_id = asyncHandler(async (req, res, next) => {
    const post = await BlogPost.findById(req.params.id, { __v: 0 })
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
      .exec();

    if (post === null) {
      const err = createError(404, 'Unable to find post');
      return next(err);
    }

    res.json({ post });
  });

  const edit_post = [
    // Check if current user has authorization to edit the post
    asyncHandler(async (req, res, next) => {
      // Find post to be updated
      const targetPost = await BlogPost.findById(req.params.id);

      if (!targetPost) {
        const err = createError(404, 'Unable to find post');
        return next(err);
      }

      // Check if user is an authorized editor
      const isEditor = targetPost.editors?.find(
        (editor) => editor._id === req.user?._id,
      );

      // Check if user is the author
      const isAuthor = targetPost.author._id === req.user?._id;

      if (!isEditor || !isAuthor) {
        const err = createError(401, 'Unauthorized to edit post');
        return next(err);
      } else {
        next();
      }
    }),

    // Validate and sanitize fields
    body('content', 'Content must not be empty').trim().notEmpty().escape(),

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
      // Extract the validation errors from a request.
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      }

      const targetPost = await BlogPost.findById(req.params.id);

      if (!targetPost) {
        const err = createError(404, 'Unable to find post');
        return next(err);
      }

      // Define fields to be updated
      targetPost.content = req.body.content;
      targetPost.edits.push({ timestamp: Date.now() });

      // Update the record
      await targetPost.save();

      // Send location and success result
      res.location(`/api/posts/${req.params.id}`).json({
        success: true,
        message: 'Successfully updated post content',
        post: targetPost,
        link: `/api/posts/${req.params.id}`,
      });
    }),
  ];

  const delete_post = [
    // Check if user has the authorization to delete post
    asyncHandler(async (req, res, next) => {
      // Find post to be updated
      const targetPost = await BlogPost.findById(req.params.id);

      if (!targetPost) {
        const err = createError(404, 'Unable to find post');
        return next(err);
      }

      // Check if user is the author
      const isAuthor = targetPost.author._id === req.user?._id;

      if (!isAuthor) {
        const err = createError(401, 'Unauthorized to delete post');
        return next(err);
      } else {
        next();
      }
    }),

    // Process deletion of post
    asyncHandler(async (req, res, next) => {
      const result = await BlogPost.findByIdAndDelete(req.params.id);

      if (result) {
        res.status(204).end();
      } else {
        const err = createError(500, 'Failed to delete post');
        return next(err);
      }
    }),
  ];

  return {
    get_posts,
    create_post,
    get_post_by_id,
    edit_post,
    delete_post,
  };
})();

export default postController;
