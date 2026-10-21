import { Schema, model } from 'mongoose';

const historySchema = new Schema({ actor: { type: Schema.Types.ObjectId, ref: 'User', required: true }, oldValue: { type: Number, required: true }, newValue: { type: Number, required: true }, reason: { type: String, required: true, maxlength: 1000 }, createdAt: { type: Date, default: Date.now } }, { _id: false });
const schema = new Schema({
  month: { type: String, required: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  day: { type: Number, required: true, min: 1, max: 31 },
  baseWork: { type: Number, required: true, min: 0, max: 2 },
  adjustedWork: { type: Number, min: 0, max: 2, default: null },
  reason: { type: String, default: '' },
  history: { type: [historySchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ month: 1, employee: 1, day: 1 }, { unique: true });

export const AttendanceRecord = model('AttendanceRecord', schema, 'attendanceRecords');
