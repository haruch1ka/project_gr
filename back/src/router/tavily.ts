import { Router } from 'express';

const router = Router();

const TAVILY_BASE = 'https://api.tavily.com';

router.post('/search', async (req, res) => {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'TAVILY_API_KEY が未設定です' });
    return;
  }

  const { query } = req.body as { query: string };

  const tavilyRes = await fetch(`${TAVILY_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!tavilyRes.ok) {
    res.status(tavilyRes.status).json({ error: `Tavily error: ${tavilyRes.status}` });
    return;
  }

  const data = await tavilyRes.json() as { results?: any[] };
  const results = (data.results ?? []).map((r: any) => ({
    title:   r.title   ?? '',
    url:     r.url     ?? '',
    snippet: r.content ?? r.snippet ?? '',
  }));
  res.json({ results });
});

router.post('/extract', async (req, res) => {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'TAVILY_API_KEY が未設定です' });
    return;
  }

  const { url } = req.body as { url: string };

  const tavilyRes = await fetch(`${TAVILY_BASE}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, urls: [url] }),
  });

  if (!tavilyRes.ok) {
    res.status(tavilyRes.status).json({ error: `Tavily error: ${tavilyRes.status}` });
    return;
  }

  const data = await tavilyRes.json() as { results?: any[] };
  const result = data.results?.[0];
  if (!result) {
    res.json({ results: [] });
    return;
  }
  res.json({
    results: [{
      title:   result.url ?? url,
      url:     result.url ?? url,
      snippet: result.raw_content ?? '',
    }],
  });
});

export default router;
