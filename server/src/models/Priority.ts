import { Schema, model } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  level: { type: Number, required: true, min: 1, max: 5, unique: true },
  targetHours: { type: Number, required: true, min: 1 },
  color: { type: String, default: '#64748b' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const Priority = model('Priority', schema);
