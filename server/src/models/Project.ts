import { Schema, model } from 'mongoose';

const wallSchema = new Schema({
  points: [{ x: Number, y: Number }],
  colorId: { type: Schema.Types.ObjectId, ref: 'Color' },
  patternId: { type: Schema.Types.ObjectId, ref: 'Pattern' },
  opacity: { type: Number, default: 0.8 },
  finish: { type: String, default: 'matte' },
});

const projectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Untitled design' },
    originalImageUrl: { type: String, required: true },
    walls: [wallSchema],
    resultImageUrl: String,
  },
  { timestamps: true }
);

export const Project = model('Project', projectSchema);
