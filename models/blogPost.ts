import mongoose, { Model, Types } from 'mongoose';
import { CommentSchema } from './comment';

const Schema = mongoose.Schema;

const BlogPostSchema = new Schema<
  BlogPost,
  Model<BlogPost, {}, { comments: Types.DocumentArray<Comment> }>
>({
  date_created: {
    type: Date,
    default: Date.now(),
  },
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 80,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  editors: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
  },
  liked_by: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
  },
  tags: {
    type: [String],
    default: [],
  },
  edits: {
    type: [{ timestamp: Date }],
  },
  display_img: {
    url: String,
    owner: String,
    source: {
      type: String,
      default: 'Unsplash',
    },
  },
  content: {
    type: String,
    required: true,
  },
  comments: {
    type: [CommentSchema],
    required: false,
  },
  is_private: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    required: true,
  },
});

const BlogPostModel = mongoose.model('BlogPost', BlogPostSchema);

export default BlogPostModel;
