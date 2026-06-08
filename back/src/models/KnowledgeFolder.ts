import { Schema, model } from 'mongoose';

const knowledgeFolderSchema = new Schema({
  field:    { type: String, required: true },
  title:    { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeFolder', default: null },
  order:    { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const KnowledgeFolder = model('KnowledgeFolder', knowledgeFolderSchema);
