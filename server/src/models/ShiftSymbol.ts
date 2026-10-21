import { Schema, model } from 'mongoose';

const schema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
  workFactor: { type: Number, required: true, min: 0, max: 2, default: 0 },
  plantKey: { type: String, enum: ['SB2', 'SB4', null], default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const ShiftSymbol = model('ShiftSymbol', schema);
