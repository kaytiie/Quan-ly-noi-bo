import { Schema, model } from 'mongoose';

const schema = new Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const Plant = model('Plant', schema);
