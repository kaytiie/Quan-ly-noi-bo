import { Schema, model } from 'mongoose';

const schema = new Schema({
  plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });
schema.index({ plant: 1, name: 1 }, { unique: true });

export const EquipmentSystem = model('EquipmentSystem', schema);
