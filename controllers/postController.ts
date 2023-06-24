import { NextFunction, Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import slugify from 'slugify';
import createError from 'http-errors';

import userProjection from '../config/projections/userProjection';
import postProjection from '../config/projections/postProjection';
import BlogPost from '../models/blogPost';
import TagModel from '../models/tag';

const postController = (() => {
  const checkAuthorization = () =>
    asyncHandler(async (req, res, next) => {
      // Find post to be updated
      const targetPost = await BlogPost.findById(req.params.id, postProjection);

      if (!targetPost) {
        const err = createError(404, 'Unable to find post');
        return next(err);
      }

      // Check if user is an authorized editor
      const isEditor = targetPost.editors?.find((editor) =>
        req.user?._id.equals(editor._id),
      );

      // Check if user is the author
      const isAuthor = req.user?._id.equals(targetPost.author._id);

      if (!(isEditor || isAuthor)) {
        const err = createError(401, 'Unauthorized to edit post');
        return next(err);
      } else {
        next();
      }
    });

  // Return list of all posts in database
  const get_posts = asyncHandler(async (req, res, next) => {
    const allPosts = await BlogPost.find({}, postProjection)
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
      .populate('comments.author', userProjection)
      .populate('tags', { __v: 0 })
      .exec();

    res.json({ posts: allPosts });
  });

  const create_post = [
    // Check if user is verified author
    function (req: Request, res: Response, next: NextFunction) {
      if (!req.user) {
        const err = createError(401);
        return next(err);
      }

      if (!req.user.is_verified_author) {
        const err = createError(403, 'Only verified authors can create posts');
        return next(err);
      }

      next();
    },

    // Handle type of req.body.tag
    function (req: Request, res: Response, next: NextFunction) {
      if (!(req.body.tag instanceof Array)) {
        if (typeof req.body.tag === 'undefined') {
          req.body.tag = [];
        } else {
          req.body.tag = new Array(req.body.tag);
        }
      }

      next();
    },

    // Validate and sanitize fields
    body('title', 'Title must not be empty').trim().notEmpty().escape(),
    body('content', 'Content must not be empty').trim().notEmpty().escape(),
    body('tag.*').escape(),
    body('display_img.url').notEmpty().escape(),
    body('category', 'Category must not be empty').trim().notEmpty().escape(),
    body('is_private').escape(),

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
        author: user?._id,
        editors: [],
        content: req.body.content,
        comments: [],
        liked_by: [],
        tags: req.body.tag,
        edits: [],
        category: req.body.category,
        is_private: req.body.is_private || false,
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
    }),
  ];

  const get_post_by_slug = asyncHandler(async (req, res, next) => {
    const post = await BlogPost.findOne(
      { slug: req.params.slug },
      postProjection,
    )
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
      .populate('tags', { __v: 0 })
      .exec();

    if (post === null) {
      const err = createError(404, 'Unable to find post');
      return next(err);
    }

    res.json({ post });
  });

  const edit_post = [
    // Check if current user has authorization to edit the post
    checkAuthorization(),

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

      const targetPost = await BlogPost.findById(req.params.id, postProjection);

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

  const edit_privacy = [
    // Check is user has authorization to edit post privacy
    checkAuthorization(),

    // Sanitize input
    body('is_private').trim().isBoolean(),

    // Process request
    asyncHandler(async (req, res, next) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      } else {
        // No errors. Update record and return new user.
        const post = await BlogPost.findByIdAndUpdate(
          req.params.id,
          {
            is_private: req.body.is_private,
          },
          { runValidators: true, returnDocument: 'after' },
        );

        res.location(`/api/posts/${req.params.id}`).json({
          success: true,
          message: `Successfully updated post privacy`,
          post,
          link: `/api/posts/${req.params.id}`,
        });
      }
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
      const isAuthor = req.user?._id.equals(targetPost.author._id);

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

  const get_posts_by_tagname = asyncHandler(async (req, res, next) => {
    const tag = await TagModel.findOne(
      { name: req.params.tagName },
      { __v: 0 },
    );

    if (!tag) {
      const err = createError(404, 'Unable to find posts with this tagname');
      return next(err);
    }

    const posts = await BlogPost.find({ tags: tag._id }, postProjection)
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
      .populate('tags', { __v: 0 })
      .exec();

    res.json({
      tag: req.params.tagname,
      posts,
    });
  });

  const get_posts_by_category = asyncHandler(async (req, res, next) => {
    const posts = await BlogPost.find(
      { category: req.params.category },
      postProjection,
    )
      .populate('author', userProjection)
      .populate('editors', userProjection)
      .populate('liked_by', userProjection)
      .populate('tags', { __v: 0 })
      .exec();

    res.json({
      category: req.params.category,
      posts,
    });
  });

  const get_newest_posts = asyncHandler(async (req, res, next) => {
    const { limit = 10 } = req.query;

    const newestPosts = await BlogPost.find({}, postProjection)
      .sort({ date_created: -1 })
      .limit(+limit)
      .exec();

    res.json({
      posts: newestPosts,
    });
  });

  const getTargetPost = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
      const err = createError(403);
      return next(err);
    }

    const targetPost = await BlogPost.findOne({
      slug: req.params.slug,
    }).populate('liked_by', userProjection);

    if (!targetPost) {
      const err = createError(404, 'Unable to find post');
      return next(err);
    } else {
      req.post = targetPost;
      next();
    }
  });

  const get_post_likes = [
    getTargetPost,
    function (req: Request, res: Response, next: NextFunction) {
      const post = req.post as BlogPost;

      if (!post) {
        const err = createError(500);
        return next(err);
      }

      res.json({
        post: `/api/posts/${post.slug}`,
        likes: post.liked_by,
      });
    },
  ];

  const add_post_like = [
    getTargetPost,

    asyncHandler(async (req, res, next) => {
      const user = req.user;
      if (!user) {
        const err = createError(403);
        return next(err);
      }

      const post = req.post as BlogPost;
      if (!post) {
        const err = createError(500);
        return next(err);
      }

      const isPostLikedByUser = post.liked_by.find((liker) =>
        liker._id.equals(user._id),
      );

      if (isPostLikedByUser) {
        res.status(409).end();
      } else {
        // Update post
        const updatedPost = await BlogPost.findOneAndUpdate(
          {
            slug: req.params.slug,
          },
          { $push: { liked_by: user._id } },
          { runValidators: true, returnDocument: 'after' },
        );
        const postLink = `/api/posts/${req.params.slug}`;

        if (updatedPost) {
          res.status(201).location(postLink).json({
            success: true,
            message: 'Successfully added a like to post',
            link: postLink,
          });
        } else {
          const err = createError(500);
          return next(err);
        }
      }
    }),
  ];

  const remove_post_like = [
    getTargetPost,

    asyncHandler(async (req, res, next) => {
      const user = req.user;
      if (!user) {
        const err = createError(403);
        return next(err);
      }

      const post = req.post as BlogPost;
      if (!post) {
        const err = createError(500);
        return next(err);
      }

      const isPostLikedByUser = post.liked_by.find((liker) =>
        liker._id.equals(user._id),
      );

      if (!isPostLikedByUser) {
        res.status(409).end();
      } else {
        // Update post
        const updatedPost = await BlogPost.findOneAndUpdate(
          {
            slug: req.params.slug,
          },
          { $pull: { liked_by: user._id } },
          { runValidators: true, returnDocument: 'after' },
        );
        const postLink = `/api/posts/${req.params.slug}`;

        if (updatedPost) {
          res.location(postLink).json({
            success: true,
            message: 'Successfully removed a like in post',
            link: postLink,
          });
        } else {
          const err = createError(500);
          return next(err);
        }
      }
    }),
  ];

  return {
    get_posts,
    create_post,
    get_post_by_slug,
    edit_post,
    delete_post,
    get_posts_by_tagname,
    get_posts_by_category,
    get_newest_posts,
    edit_privacy,
    get_post_likes,
    add_post_like,
    remove_post_like,
  };
})();

export default postController;
