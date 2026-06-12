import { Schema, model } from 'mongoose';

const knowledgeSchema = new Schema({
  field:       { type: String, required: true },
  type: {
    type: String,
    enum: ['hypothesis', 'distilled'],
    default: 'hypothesis',
  },
  category:    { type: String, required: true },
  subcategory: { type: String, default: '' },
  content:     { type: String, required: true },
  webSources:               { type: Array, default: [] },
  supportingExperiences:    { type: Array, default: [] },
  contradictingExperiences: { type: Array, default: [] },
  confidenceScore: { type: Number, default: 0.05, min: 0, max: 1 },
  noveltyScore:    { type: Number, default: null, min: 0, max: 1 },  // distilledのみ。一般常識からの意外性
  sourceKnowledgeId: { type: Schema.Types.ObjectId, ref: 'Knowledge', default: null },
  tags:      { type: [String], default: [] },
  folderId:  { type: Schema.Types.ObjectId, ref: 'KnowledgeFolder', default: null },
  createdAt: { type: Date, default: Date.now },
});

export const Knowledge = model('Knowledge', knowledgeSchema);
