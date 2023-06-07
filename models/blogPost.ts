import mongoose, { Model } from 'mongoose';
import { CommentSchema } from './comment';

const Schema = mongoose.Schema;

const BlogPostSchema = new Schema<BlogPost, Model<BlogPost>>({
  date_created: { type: Date, default: Date.now() },
  title: { type: String, required: true, minlength: 3, maxlength: 240 },
  slug: { type: String, required: true, unique: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  comments: { type: [CommentSchema], required: false },
});

const BlogPostModel = mongoose.model('BlogPost', BlogPostSchema);

export default BlogPostModel;
