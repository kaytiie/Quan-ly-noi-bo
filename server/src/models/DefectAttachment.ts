import { Schema, model } from 'mongoose';

const schema = new Schema({
  ticket: { type: Schema.Types.ObjectId, ref: 'DefectTicket', required: true, index: true },
  log: { type: Schema.Types.ObjectId, ref: 'DefectLog', default: null },
  filename: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const DefectAttachment = model('DefectAttachment', schema);
