import { Schema, model } from 'mongoose';

const patternSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    style: String,
    imageUrl: { type: String, required: true },
    scale: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Pattern = model('Pattern', patternSchema);
