import mongoose, { Model } from 'mongoose';

const Schema = mongoose.Schema;

const UserSchema = new Schema<User, Model<User>>({
  date_created: { type: Date, default: Date.now() },
  username: { type: String, required: true, minLength: 6, maxLength: 30 },
  email: { type: String, required: true, maxlength: 1024 },
  salt: { type: String, required: true },
  hash: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  posts: { type: [Schema.Types.ObjectId], ref: 'BlogPost', required: false },
});

const UserModel = mongoose.model('User', UserSchema);

export default UserModel;
