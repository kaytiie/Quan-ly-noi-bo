import { Schema, model } from 'mongoose';

const schema = new Schema({
  schedule: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true, index: true },
  month: { type: String, required: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  day: { type: Number, required: true },
  field: { type: String, enum: ['shift', 'transport', 'leader'], default: 'shift' },
  oldValue: { type: String, default: '' },
  newValue: { type: String, default: '' },
  reason: { type: String, required: true, maxlength: 1000 },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const ScheduleChange = model('ScheduleChange', schema);
