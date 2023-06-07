import mongoose, { Model } from 'mongoose';

const Schema = mongoose.Schema;

export const CommentSchema = new Schema<Comment, Model<Comment>>({
  date_created: { type: Date, default: Date.now() },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  comment_level: { type: Number, required: true, min: 0 },
  parent_comment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    required: false,
  },
  liked_by: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    required: false,
  },
});

const CommentModel = mongoose.model('Comment', CommentSchema);

export default CommentModel;
