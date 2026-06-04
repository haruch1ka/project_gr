import { Schema, model } from 'mongoose';

const researchResultSchema = new Schema({
  field:      { type: String, required: true },
  query:      { type: String, required: true },
  results: [{
    title:   String,
    url:     String,
    snippet: String,
  }],
  collectedAt:       { type: Date, default: Date.now },
  usedInKnowledgeIds: [{ type: String }],
});

export const ResearchResult = model('ResearchResult', researchResultSchema);
