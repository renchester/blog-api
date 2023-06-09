import { body, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import createError from 'http-errors';

import Tag from '../models/tag';
import BlogPost from '../models/blogPost';

const tagController = (() => {
  const get_tags = asyncHandler(async (req, res, next) => {
    const tags = await Tag.find({});

    res.json({ tags });
  });

  const create_tag = [
    // Validate and sanitize fields
    body('name', 'Tag name must be between 3 and 64 characters')
      .trim()
      .isLength({ min: 3, max: 64 })
      .isAlphanumeric()
      .withMessage('Tag must only contain alpha-numeric characters')
      .escape()
      .bail()
      .custom(async (tagName) => {
        const isTagNameTaken = await Tag.findOne({ name: tagName });

        if (isTagNameTaken) {
          throw new Error('Tag name is already in use');
        }
      }),

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
      // Extract the validation errors from request
      const errors = validationResult(req);

      // Create a Tag object with escaped and trimmed data
      const tag = new Tag({
        name: req.body.name,
      });

      if (!errors.isEmpty()) {
        // There are errors. Return error message
        const err = createError(400, errors.array()[0].msg);
        return next(err);
      }

      // Create new record
      const newTag = await tag.save();

      // Return appropriate response
      res
        .status(201)
        .location(`/api/tags/${newTag._id}`)
        .json({
          success: true,
          message: 'Successfully created tag',
          tag: newTag,
          link: `/api/tags/${newTag._id}`,
        });
    }),
  ];

  const get_tag_by_id = asyncHandler(async (req, res, next) => {
    const tag = await Tag.findById(req.params.id);

    if (tag === null) {
      const err = createError(400, 'Tag not found');
      return next(err);
    }

    res.json({ tag });
  });

  const delete_tag = asyncHandler(async (req, res, next) => {
    // Check if user is admin (has authorization to delete tag)
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      const err = createError(401, 'Unauthorized to delete tag');
      return next(err);
    }

    // User is admin. Delete record
    const result = await Tag.findByIdAndDelete(req.params.id);

    // Delete tags from posts
    await BlogPost.updateMany(
      { tags: { _id: result?._id } },
      { tags: { $pull: { _id: result?._id } } },
    );

    if (result) {
      res.status(204).end();
    } else {
      const err = createError(500, 'Failed to delete tag');
      return next(err);
    }
  });

  return {
    get_tags,
    create_tag,
    get_tag_by_id,
    delete_tag,
  };
})();

export default tagController;
