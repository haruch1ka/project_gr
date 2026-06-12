export type Field = {
  _id?: string;
  name: string;
  icon: string;
};

export type Experience = {
  _id?: string;
  field: string;
  date: string;
  memo: string;
  createdAt: string;
};

export type ResearchResult = {
  _id?: string;
  field: string;
  query: string;
  results: { title: string; url: string; snippet: string }[];
  collectedAt: string;
  usedInKnowledgeIds: string[];
};

export type KnowledgeFolder = {
  _id?: string;
  field: string;
  title: string;
  parentId: string | null;
  order: number;
  createdAt?: string;
};

export type Knowledge = {
  _id?: string;
  field: string;
  type: 'hypothesis' | 'distilled';
  category: string;
  subcategory?: string;
  folderId?: string | null;
  content: string;
  webSources: ResearchResult[];
  supportingExperiences: Experience[];
  contradictingExperiences: Experience[];
  confidenceScore: number;
  noveltyScore?: number | null;
  sourceKnowledgeId?: string | null;
  tags: string[];
  createdAt: string;
};

export type KnowledgeProposal = {
  _id: string;
  field: string;
  content: string;
  confidenceScore: number;
  noveltyScore?: number | null;
  supportingExperienceIds: string[];
  sourceKnowledgeId: string | null;
  detectedAt: string;
};

export type Plan = {
  _id?: string;
  field: string;
  proposal: string;
  dialogHistory: ChatMessage[];
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};
