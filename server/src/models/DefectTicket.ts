import { Schema, model } from 'mongoose';

export const defectStatuses = ['new', 'accepted', 'in_progress', 'waiting_material', 'paused', 'awaiting_acceptance', 'rejected', 'needs_rework', 'closed', 'cancelled'] as const;
const schema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  detectedAt: { type: Date, required: true, index: true },
  reporterName: { type: String, required: true, trim: true },
  reporterEmployee: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
  system: { type: Schema.Types.ObjectId, ref: 'EquipmentSystem', required: true, index: true },
  equipment: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 8000 },
  priority: { type: Schema.Types.ObjectId, ref: 'Priority', required: true, index: true },
  temporaryMeasure: { type: String, trim: true, maxlength: 3000, default: '' },
  status: { type: String, enum: defectStatuses, default: 'new', index: true },
  assignedTeam: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
  assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  collaborators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  dueAt: { type: Date, default: null, index: true },
  closedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ plant: 1, status: 1, detectedAt: -1 });
schema.index({ equipment: 1, detectedAt: -1 });

export const DefectTicket = model('DefectTicket', schema);
