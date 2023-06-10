import mongoose, { Model } from 'mongoose';

const Schema = mongoose.Schema;

const TagSchema = new Schema<Tag, Model<Tag>>({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 64,
    unique: true,
  },
});

const TagModel = mongoose.model('Tag', TagSchema);

export default TagModel;
