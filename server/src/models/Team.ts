import { Schema, model } from 'mongoose';

const teamSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true, optimisticConcurrency: true });

export const Team = model('Team', teamSchema);
