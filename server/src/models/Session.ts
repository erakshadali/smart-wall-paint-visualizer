import { Schema, model } from 'mongoose';

const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seconds: { type: Number, min: 0, max: 86400, required: true },
  },
  { timestamps: true }
);

export const Session = model('Session', sessionSchema);
