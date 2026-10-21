import { Schema, model, type InferSchemaType } from 'mongoose';

export const roles = ['admin', 'manager', 'employee', 'leader'] as const;
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: roles, required: true, default: 'employee' },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  active: { type: Boolean, default: true },
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
}, { timestamps: true, versionKey: '__v' });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
