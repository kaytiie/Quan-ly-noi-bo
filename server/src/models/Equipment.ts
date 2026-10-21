import { Schema, model } from 'mongoose';

const schema = new Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
  system: { type: Schema.Types.ObjectId, ref: 'EquipmentSystem', required: true, index: true },
  description: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ plant: 1, system: 1, name: 1 });

export const Equipment = model('Equipment', schema);
