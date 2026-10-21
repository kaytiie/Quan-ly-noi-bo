import { Schema, model } from 'mongoose';

const historySchema = new Schema({ action: { type: String, enum: ['closed', 'reopened'], required: true }, actor: { type: Schema.Types.ObjectId, ref: 'User', required: true }, reason: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }, { _id: false });
const schema = new Schema({
  month: { type: String, required: true, unique: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  history: { type: [historySchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true });

export const AttendancePeriod = model('AttendancePeriod', schema);
