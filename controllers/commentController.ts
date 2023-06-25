import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import createError from 'http-errors';
import { Request, Response, NextFunction } from 'express';

import userProjection from '../config/projections/userProjection';
import BlogPost from '../models/blogPost';

const commentController = (() => {
  const get_post_comments = asyncHandler(async (req, res, next) => {
    const targetPost = await BlogPost.findOne(
      { slug: req.params.slug },
      { __v: 0 },
    )
      .populate('comments', { __v: 0 })
      .populate('comments.author', userProjection)
      .exec();

    if (!targetPost) {
      const err = createError(404, 'Unable to find post');
      return next(err);
    }

    res.json({
      post_link: `/api/posts/${targetPost.slug}`,
      comments: targetPost.comments,
    });
  });

  const create_comment = [
    // Sanitize and validate fields
    body('content', 'Comment cannot be empty').trim().notEmpty().escape(),

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
        const err = createError(401, 'Unauthorized to create comment');
        return next(err);
      }

      // Extract parent comment, if it exists
      const parentComment = req.body.parent_comment;

      // Get parent post
      const targetPost = await BlogPost.findOne({ slug: req.params.slug });

      if (!targetPost) {
        const err = createError(
          404,
          'Unable to find parent post for this comment',
        );
        return next(err);
      }

      // Push comment to Post model
      targetPost.comments.push({
        author: user._id,
        content: req.body.content,
        comment_level: parentComment?.level + 1 || 1,
        parent_comment_id: parentComment?._id,
        liked_by: [],
        edits: [],
      });

      const updatedPost = await targetPost.save();
      const newComment = updatedPost.comments.find(
        (comment) =>
          req.user?._id.equals(comment.author) &&
          comment.content === req.body.content,
      );
      const commentLink = `/api/posts/${updatedPost.slug}/comments/${newComment?._id}`;
      const postLink = `/api/posts/${updatedPost.slug}`;

      // Send url of new comment
      res.status(201).location(commentLink).json({
        success: true,
        message: 'Successfully created comment',
        comment: newComment,
        link: commentLink,
        post_link: postLink,
      });
    }),
  ];

  const get_comment_by_id = asyncHandler(async (req, res, next) => {
    const parentPost = await BlogPost.findOne(
      { slug: req.params.slug },
      { __v: 0 },
    )
      .populate('comments', { __v: 0 })
      .populate('comments.author', userProjection)
      .populate('comments.liked_by', userProjection)
      .exec();

    if (!parentPost) {
      const err = createError(
        404,
        'Unable to find the parent post for this comment',
      );
      return next(err);
    }

    const comment = parentPost.comments.find(
      (comment) => comment._id.toString() === req.params.commentid,
    );

    if (!comment) {
      const err = createError(404, 'Unable to find comment');
      return next(err);
    }

    res.json({ comment });
  });

  const edit_comment = [
    // Check if current user has authorization to edit the comment
    asyncHandler(async (req, res, next) => {
      // Find comment to be updated
      const parentPost = await BlogPost.findOne({ slug: req.params.slug });

      if (!parentPost) {
        const err = createError(
          404,
          'Unable to find the parent post for this comment',
        );
        return next(err);
      }

      const comment = parentPost.comments.find(
        (comment) => comment._id.toString() === req.params.commentid,
      );

      if (!comment) {
        const err = createError(404, 'Unable to find comment');
        return next(err);
      }

      const isAuthor = req.user?._id.equals(comment.author._id);

      if (!isAuthor) {
        const err = createError(401, 'Unauthorized to edit comment');
        return next(err);
      } else {
        return next();
      }
    }),

    // Validate and sanitize fields
    body('content', 'Comment must not be empty').trim().notEmpty().escape(),

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
      // Extract the validation errors from a request.
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      }

      const parentPost = await BlogPost.findOne({ slug: req.params.slug });

      if (!parentPost) {
        const err = createError(
          404,
          'Unable to find the parent post for this comment',
        );
        return next(err);
      }

      // Get target comment to be edited
      const targetComment = parentPost.comments.find(
        (comment) => comment._id.toString() === req.params.commentid,
      );

      // Define fields to be updated
      if (!targetComment) {
        const err = createError(404, 'Unable to find comment');
        return next(err);
      }

      // Update the record
      targetComment.content = req.body.content;
      targetComment.edits.push({ timestamp: Date.now() });
      await parentPost.save();

      const updatedComment = parentPost.comments.find((comment) =>
        comment._id.equals(req.params.commentid),
      );
      const commentLink = `/api/posts/${parentPost.slug}/comments/${targetComment._id}`;
      const postLink = `/api/posts/${parentPost.slug}`;

      // Send location and success result
      res.location(commentLink).json({
        success: true,
        message: 'Successfully updated comment',
        comment: updatedComment,
        link: commentLink,
        post_link: postLink,
      });
    }),
  ];

  const delete_comment = [
    // Check if user has the authorization to delete comment
    asyncHandler(async (req, res, next) => {
      // Find comment to be deleted
      const parentPost = await BlogPost.findOne({ slug: req.params.slug })
        .populate('comments')
        .populate('comments.author')
        .exec();

      if (!parentPost) {
        const err = createError(
          404,
          'Unable to find the parent post for this comment',
        );
        return next(err);
      }

      const targetComment = parentPost.comments.find(
        (comment) => comment._id.toString() === req.params.commentid,
      );

      if (!targetComment) {
        const err = createError(404, 'Unable to find comment');
        return next(err);
      }

      const isAuthor = req.user?._id.equals(targetComment.author._id);

      if (!isAuthor) {
        const err = createError(403, 'Unauthorized to delete comment');
        return next(err);
      } else {
        // Delete the comment record
        await BlogPost.findOneAndUpdate(
          { slug: req.params.slug },
          { $pull: { comments: { _id: req.params.commentid } } },
        );

        res.status(204).end();
      }
    }),
  ];

  const getTargetComment = asyncHandler(async (req, res, next) => {
    const user = req.user;

    // Check if current user exists
    if (!user) {
      const err = createError(401);
      return next(err);
    }

    const parentPost = await BlogPost.findOne({ slug: req.params.slug })
      .populate('comments', { __v: 0 })
      .populate('comments.liked_by', userProjection)
      .exec();

    if (!parentPost) {
      const err = createError(
        404,
        'Unable to find parent post for this comment',
      );
      return next(err);
    }

    const targetComment = parentPost.comments.find(
      (currComment) => currComment._id.toString() === req.params.commentid,
    );

    if (!targetComment) {
      const err = createError(404, 'Unable to find comment');
      return next(err);
    } else {
      req.post = parentPost;
      req.comment = targetComment;
      next();
    }
  });

  const get_comment_likes = [
    getTargetComment,
    function (req: Request, res: Response, next: NextFunction) {
      const parentPost = req.post as BlogPost;
      const targetComment = req.comment as Comment;

      if (!targetComment || !parentPost) {
        const err = createError(500);
        next(err);
      }

      res.json({
        comment: `/api/posts/${parentPost.slug}/comments/${targetComment._id}`,
        likes: targetComment.liked_by,
      });
    },
  ];

  const add_comment_like = [
    getTargetComment,

    asyncHandler(async (req, res, next) => {
      const user = req.user;
      if (!user) {
        const err = createError(401);
        return next(err);
      }

      const targetComment = req.comment as Comment;
      const parentPost = req.post as BlogPost;
      if (!parentPost || !targetComment) {
        const err = createError(500); // comment and post should have been declared already
        return next(err);
      }

      const isCommentLikedByUser = targetComment.liked_by.find((liker) =>
        liker._id.equals(user?._id),
      );

      if (isCommentLikedByUser) {
        res.status(409).end();
      } else {
        // Process adding a like
        targetComment.liked_by.push(user._id);

        // Update post comments
        const otherComments = parentPost.comments.filter(
          (currComment) => !currComment._id.equals(targetComment._id),
        );
        const updatedPostComments = [...otherComments, targetComment];

        const updatedPost = await BlogPost.findOneAndUpdate(
          { slug: req.params.slug },
          { comments: updatedPostComments },
          { runValidators: true, returnDocument: 'after' },
        );
        const postLink = `/api/posts/${req.params.slug}/comments/${req.params.commentid}`;

        if (updatedPost) {
          res.location(postLink).json({
            success: true,
            message: 'Successfully added a like to comment',
            link: postLink,
          });
        } else {
          const err = createError(500);
          return next(err);
        }
      }
    }),
  ];

  const remove_comment_like = [
    getTargetComment,

    asyncHandler(async (req, res, next) => {
      const user = req.user;
      if (!user) {
        const err = createError(401);
        return next(err);
      }

      const targetComment = req.comment as Comment;
      const parentPost = req.post as BlogPost;
      if (!parentPost || !targetComment) {
        const err = createError(500); // comment and post should have been declared already
        return next(err);
      }

      const isCommentLikedByUser = targetComment.liked_by.find((liker) =>
        liker._id.equals(user?._id),
      );

      if (!isCommentLikedByUser) {
        res.status(409).end();
      } else {
        // Update comment likes
        const updatedLikes = targetComment.liked_by.filter(
          (liker) => !liker._id.equals(user._id),
        );
        targetComment.liked_by = updatedLikes;

        // Update comments
        const otherComments = parentPost.comments.filter(
          (currComment) => !currComment._id.equals(targetComment._id),
        );
        const updatedPostComments = [...otherComments, targetComment];

        const updatedPost = await BlogPost.findOneAndUpdate(
          { slug: req.params.slug },
          { comments: updatedPostComments },
          { runValidators: true, returnDocument: 'after' },
        );
        const postLink = `/api/posts/${req.params.slug}/comments/${req.params.commentid}`;

        if (updatedPost) {
          res.location(postLink).json({
            success: true,
            message: 'Successfully removed a like in comment',
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
    get_post_comments,
    create_comment,
    get_comment_by_id,
    edit_comment,
    delete_comment,
    get_comment_likes,
    add_comment_like,
    remove_comment_like,
  };
})();

export default commentController;
