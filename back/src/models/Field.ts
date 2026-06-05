import { Schema, model } from 'mongoose';

const fieldSchema = new Schema({
  name:      { type: String, required: true, unique: true },
  icon:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Field = model('Field', fieldSchema);
