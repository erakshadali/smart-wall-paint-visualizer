import { Schema, model } from 'mongoose';

const wallSchema = new Schema({
  type: { type: String, enum: ['polygon', 'brush'], default: 'polygon' },
  points: [{ x: Number, y: Number }],
  brushSize: Number,
  colorId: { type: Schema.Types.ObjectId, ref: 'Color' },
  patternId: { type: Schema.Types.ObjectId, ref: 'Pattern' },
  patternScale: { type: Number, default: 1, min: 0.2, max: 4 },
  brightness: { type: Number, default: 1, min: 0.5, max: 1.5 },
  opacity: { type: Number, default: 0.8, min: 0, max: 1 },
  finish: { type: String, enum: ['matte', 'satin', 'glossy'], default: 'matte' },
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
