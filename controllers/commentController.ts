import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import createError from 'http-errors';

import BlogPost from '../models/blogPost';
import { CommentSchema } from '../models/comment';

const commentController = (() => {
  const userProjection = {
    first_name: 1,
    last_name: 1,
    username: 1,
    email: 1,
  };

  const get_post_comments = asyncHandler(async (req, res, next) => {
    const targetPost = await BlogPost.findById(req.params.postid, { __v: 0 })
      .populate('comments')
      .populate('comments.author', userProjection)
      .exec();

    if (!targetPost) {
      const err = createError(404, 'Unable to find post');
      return next(err);
    }

    res.json({
      postid: targetPost._id,
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
      const targetPost = await BlogPost.findById(req.params.postid);

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
        comment_level: parentComment?.level + 1 || 0,
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

      // Send url of new comment
      res
        .status(201)
        .location(`/api/posts/${updatedPost._id}/comments/${newComment?._id}`)
        .json({
          success: true,
          message: 'Successfully created comment',
          comment: newComment,
          link: `/api/posts/${updatedPost._id}/comments/${newComment?._id}`,
          post_link: `/api/posts/${updatedPost._id}`,
        });
    }),
  ];

  const get_comment_by_id = asyncHandler(async (req, res, next) => {
    const parentPost = await BlogPost.findById(req.params.postid, { __v: 0 })
      .populate('comments')
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
      const parentPost = await BlogPost.findById(req.params.postid);

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

      const parentPost = await BlogPost.findById(req.params.postid);

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

      // Send location and success result
      res
        .location(`/api/posts/${parentPost._id}/comments/${targetComment._id}`)
        .json({
          success: true,
          message: 'Successfully updated comment',
          post: parentPost,
          comment: updatedComment,
          link: `/api/posts/${req.params.id}`,
        });
    }),
  ];

  const delete_comment = [
    // Check if user has the authorization to delete comment
    asyncHandler(async (req, res, next) => {
      // Find comment to be deleted
      const parentPost = await BlogPost.findById(req.params.postid)
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
        const err = createError(401, 'Unauthorized to delete comment');
        return next(err);
      } else {
        // Delete the comment record
        await BlogPost.findOneAndUpdate(
          { _id: req.params.postid },
          { $pull: { comments: { _id: req.params.commentid } } },
        );

        res.status(204).end();
      }
    }),
  ];

  return {
    get_post_comments,
    create_comment,
    get_comment_by_id,
    edit_comment,
    delete_comment,
  };
})();

export default commentController;
