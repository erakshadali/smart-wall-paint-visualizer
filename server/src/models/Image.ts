import { Schema, model } from 'mongoose';

// Uploaded images live in MongoDB so the API stays stateless on hosts with ephemeral disks.
const imageSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export const Image = model('Image', imageSchema);
