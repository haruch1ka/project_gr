import { Schema, model } from 'mongoose';

const planSchema = new Schema({
  field:    { type: String, required: true },
  proposal: { type: String, required: true },
  dialogHistory: [{
    role: { type: String, enum: ['user', 'assistant'] },
    text: String,
  }],
  reviewedAt:  { type: Date, default: null },
  reviewNote:  { type: String, default: null },
  createdAt:   { type: Date, default: Date.now },
});

export const Plan = model('Plan', planSchema);
