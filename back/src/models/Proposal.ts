import { Schema, model } from 'mongoose';

const proposalSchema = new Schema({
  field:                   { type: String, required: true },
  content:                 { type: String, required: true },
  confidenceScore:         { type: Number, required: true, min: 0, max: 1 },
  supportingExperienceIds: { type: [String], default: [] },
  sourceKnowledgeId:       { type: String, default: null },
  detectedAt:              { type: Date, default: Date.now },
  expiresAt:               { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
});

// 7日後に自動削除
proposalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Proposal = model('Proposal', proposalSchema);
