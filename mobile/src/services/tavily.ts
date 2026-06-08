const BACKEND_BASE = 'https://project-gr-back.vercel.app';

export type TavilyResult = {
  title:   string;
  url:     string;
  snippet: string;
};

export async function searchByQuery(query: string): Promise<TavilyResult[]> {
  const res = await fetch(`${BACKEND_BASE}/tavily/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Tavily search error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

export async function extractFromUrl(url: string): Promise<TavilyResult[]> {
  const res = await fetch(`${BACKEND_BASE}/tavily/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Tavily extract error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\//.test(url);
}
