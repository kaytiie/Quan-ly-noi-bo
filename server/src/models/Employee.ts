import { Schema, model } from 'mongoose';

const employeeSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  phone: { type: String, trim: true, default: '' },
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, optimisticConcurrency: true });
employeeSchema.index({ fullName: 1 });

export const Employee = model('Employee', employeeSchema);
