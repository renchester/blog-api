import mongoose, { Model } from 'mongoose';

const Schema = mongoose.Schema;

const UserSchema = new Schema<User, Model<User>>({
  date_created: { type: Date, default: Date.now() },
  username: {
    type: String,
    required: true,
    minLength: 6,
    maxLength: 30,
    unique: true,
  },
  admin: { type: Boolean, required: false },
  email: { type: String, required: true, maxlength: 1024, unique: true },
  salt: { type: String, required: true },
  hash: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  tokens: {
    type: [String],
    default: [],
  },
});

const UserModel = mongoose.model('User', UserSchema);

export default UserModel;
