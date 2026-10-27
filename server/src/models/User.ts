import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Temporary accounts created by the "Try the demo" button; cleaned up by `npm run cleanup:demo`.
    isDemo: { type: Boolean, default: false, index: true },
    favouriteColors: [{ type: Schema.Types.ObjectId, ref: 'Color' }],
    favouritePatterns: [{ type: Schema.Types.ObjectId, ref: 'Pattern' }],
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
