import { Schema, model } from 'mongoose';

const surveySchema = new Schema({
  field:       { type: String, required: true },
  question:    { type: String, required: true },
  choices:     { type: [String], required: true },
  status:      { type: String, enum: ['active', 'answered', 'skipped'], default: 'active' },
  answer:      { type: String, default: null },
  answeredAt:  { type: Date, default: null },
  nextSurveyAt: { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now },
});

export const Survey = model('Survey', surveySchema);
