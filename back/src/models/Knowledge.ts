import { Schema, model } from 'mongoose';

const knowledgeSchema = new Schema({
  field:    { type: String, required: true },
  category: { type: String, required: true },
  content:  { type: String, required: true },
  webSources:               { type: Array, default: [] },
  supportingExperiences:    { type: Array, default: [] },
  contradictingExperiences: { type: Array, default: [] },
  confidenceScore: { type: Number, default: 0.2, min: 0, max: 1 },
  status: {
    type: String,
    enum: ['hypothesis', 'verified', 'disproved'],
    default: 'hypothesis',
  },
  tags:      { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const Knowledge = model('Knowledge', knowledgeSchema);
