import { Schema, model } from 'mongoose';

const schema = new Schema({
  ticket: { type: Schema.Types.ObjectId, ref: 'DefectTicket', required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['created', 'assigned', 'progress', 'status', 'acceptance', 'attachment'], required: true },
  fromStatus: { type: String, default: null },
  toStatus: { type: String, default: null },
  note: { type: String, trim: true, maxlength: 3000, default: '' },
  rootCause: { type: String, trim: true, maxlength: 3000, default: '' },
  correctiveAction: { type: String, trim: true, maxlength: 3000, default: '' },
  workDone: { type: String, trim: true, maxlength: 5000, default: '' },
  materials: [{ name: { type: String, required: true }, quantity: { type: Number, required: true, min: 0 }, unit: { type: String, required: true } }],
  acceptanceResult: { type: String, enum: ['pass', 'fail', null], default: null },
}, { timestamps: true });

export const DefectLog = model('DefectLog', schema);
