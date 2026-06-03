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

export type KnowledgeItem = {
  _id?: string;
  field: string;
  category: string;
  content: string;
  notes: string[];
  createdAt: string;
};

export type KnowledgeCategory = {
  _id?: string;
  field: string;
  name: string;
  createdAt: string;
};
