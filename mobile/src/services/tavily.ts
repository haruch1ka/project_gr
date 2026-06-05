import * as SecureStore from 'expo-secure-store';

const TAVILY_API_BASE = 'https://api.tavily.com';

export async function saveTavilyKey(apiKey: string) {
  await SecureStore.setItemAsync('TAVILY_API_KEY', apiKey);
}

export async function getTavilyKey(): Promise<string | null> {
  return SecureStore.getItemAsync('TAVILY_API_KEY');
}

export async function clearTavilyKey() {
  await SecureStore.deleteItemAsync('TAVILY_API_KEY');
}

export type TavilyResult = {
  title:   string;
  url:     string;
  snippet: string;
};

async function getKey(): Promise<string> {
  const key = await getTavilyKey();
  if (!key) throw new Error('Tavily API Key未設定');
  return key;
}

export async function searchByQuery(query: string): Promise<TavilyResult[]> {
  const apiKey = await getKey();
  const res = await fetch(`${TAVILY_API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key:        apiKey,
      query,
      search_depth:   'basic',
      max_results:    5,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search error: ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title:   r.title   ?? '',
    url:     r.url     ?? '',
    snippet: r.content ?? r.snippet ?? '',
  }));
}

export async function extractFromUrl(url: string): Promise<TavilyResult[]> {
  const apiKey = await getKey();
  const res = await fetch(`${TAVILY_API_BASE}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, urls: [url] }),
  });
  if (!res.ok) throw new Error(`Tavily extract error: ${res.status}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return [];
  return [{
    title:   result.url ?? url,
    url:     result.url ?? url,
    snippet: result.raw_content ?? '',
  }];
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\//.test(url);
}
