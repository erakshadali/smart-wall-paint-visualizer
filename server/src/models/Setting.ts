import { Schema, model } from 'mongoose';

const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed,
});

export const Setting = model('Setting', settingSchema);
