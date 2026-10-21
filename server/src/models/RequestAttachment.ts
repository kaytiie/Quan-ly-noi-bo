import { Schema, model } from 'mongoose';

const schema = new Schema({
  request: { type: Schema.Types.ObjectId, ref: 'WorkRequest', required: true, index: true },
  filename: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const RequestAttachment = model('RequestAttachment', schema);
