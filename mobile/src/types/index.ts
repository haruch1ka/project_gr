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

export type Knowledge = {
  _id?: string;
  field: string;
  category: string;
  content: string;
  webSources: ResearchResult[];
  supportingExperiences: Experience[];
  contradictingExperiences: Experience[];
  confidenceScore: number;
  status: 'hypothesis' | 'verified' | 'disproved';
  tags: string[];
  createdAt: string;
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
