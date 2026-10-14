import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    favouriteColors: [{ type: Schema.Types.ObjectId, ref: 'Color' }],
    favouritePatterns: [{ type: Schema.Types.ObjectId, ref: 'Pattern' }],
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
