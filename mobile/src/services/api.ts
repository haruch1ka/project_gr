import { Experience, Knowledge, KnowledgeFolder, KnowledgeProposal, Plan, Field } from '../types';

const BASE_URL = 'https://project-gr-back.vercel.app';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const experienceApi = {
  list: (field?: string) => {
    const q = field ? `?field=${encodeURIComponent(field)}` : '';
    return request<Experience[]>(`/experiences${q}`);
  },
  create: (body: Omit<Experience, '_id' | 'createdAt'>) =>
    request<Experience>('/experiences', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/experiences/${id}`, { method: 'DELETE' }),
};

export const knowledgeApi = {
  list: (params?: { field?: string; type?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Knowledge[]>(`/knowledge${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<Knowledge>(`/knowledge/${id}`),
  create: (body: Omit<Knowledge, '_id' | 'createdAt'>) =>
    request<Knowledge>('/knowledge', { method: 'POST', body: JSON.stringify(body) }),
  patch: (id: string, body: Partial<Knowledge>) =>
    request<Knowledge>(`/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/knowledge/${id}`, { method: 'DELETE' }),
};

export const folderApi = {
  list: (field: string) =>
    request<KnowledgeFolder[]>(`/knowledge-folders?field=${encodeURIComponent(field)}`),
  create: (body: Omit<KnowledgeFolder, '_id' | 'createdAt'>) =>
    request<KnowledgeFolder>('/knowledge-folders', { method: 'POST', body: JSON.stringify(body) }),
  patch: (id: string, body: Partial<KnowledgeFolder>) =>
    request<KnowledgeFolder>(`/knowledge-folders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/knowledge-folders/${id}`, { method: 'DELETE' }),
};

export const fieldApi = {
  list: () => request<Field[]>('/fields'),
  create: (body: Omit<Field, '_id'>) =>
    request<Field>('/fields', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/fields/${id}`, { method: 'DELETE' }),
};

export const proposalApi = {
  fetch: (field: string) =>
    request<{ proposal: KnowledgeProposal | null }>(`/proposals?field=${encodeURIComponent(field)}`),
  reject: (id: string) =>
    request<{ ok: boolean }>(`/proposals/${id}`, { method: 'DELETE' }),
};

export const planApi = {
  list: (field?: string) => {
    const q = field ? `?field=${encodeURIComponent(field)}` : '';
    return request<Plan[]>(`/plans${q}`);
  },
  create: (body: Omit<Plan, '_id' | 'createdAt'>) =>
    request<Plan>('/plans', { method: 'POST', body: JSON.stringify(body) }),
  patch: (id: string, body: Partial<Plan>) =>
    request<Plan>(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/plans/${id}`, { method: 'DELETE' }),
};
