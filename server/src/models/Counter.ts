import { Schema, model } from 'mongoose';

const schema = new Schema({ _id: { type: String }, value: { type: Number, default: 0 } }, { versionKey: false });
export const Counter = model('Counter', schema);
