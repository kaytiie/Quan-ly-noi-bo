import { Schema, model } from 'mongoose';

const cellSchema = new Schema({ day: { type: Number, required: true, min: 1, max: 31 }, symbol: { type: Schema.Types.ObjectId, ref: 'ShiftSymbol', default: null }, adjusted: { type: Boolean, default: false } }, { _id: false });
const entrySchema = new Schema({ employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true }, cells: { type: [cellSchema], default: [] } }, { _id: false });
const leaderSchema = new Schema({ day: { type: Number, required: true, min: 1, max: 31 }, employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true } }, { _id: false });
const schema = new Schema({
  month: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  entries: { type: [entrySchema], default: [] },
  transportDays: { type: [Number], default: [] },
  leaders: { type: [leaderSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  publishedAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true });

export const Schedule = model('Schedule', schema);
