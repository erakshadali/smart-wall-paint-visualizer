import { Schema, model } from 'mongoose';

const colorSchema = new Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, required: true },
    brand: String,
    finishes: [{ type: String, enum: ['matte', 'satin', 'glossy'] }],
    tags: [String],
  },
  { timestamps: true }
);

export const Color = model('Color', colorSchema);
