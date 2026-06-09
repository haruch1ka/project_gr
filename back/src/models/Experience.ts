import { Schema, model } from 'mongoose';

const experienceSchema = new Schema({
  field:     { type: String, required: true },
  date:      { type: String, required: true },
  memo:      { type: String, required: true },
  analyzed:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Experience = model('Experience', experienceSchema);
