import { Schema, model } from 'mongoose';

export const requestTypes = ['leave', 'shift_swap', 'attendance_adjustment'] as const;
const schema = new Schema({
  type: { type: String, enum: requestTypes, required: true, index: true },
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true },
  swapWith: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  requestedWork: { type: Number, min: 0, max: 2, default: null },
  reason: { type: String, required: true, maxlength: 3000 },
  evidence: { type: String, trim: true, maxlength: 3000, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  decisionReason: { type: String, trim: true, maxlength: 2000, default: '' },
  decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  decidedAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ status: 1, createdAt: -1 });

export const WorkRequest = model('WorkRequest', schema, 'requests');
