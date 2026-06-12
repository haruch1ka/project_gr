import { Router } from 'express';

const router = Router();

const MODEL   = 'gemini-2.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;

router.post('/generate', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY が未設定です' });
    return;
  }

  const { messages, systemInstruction, jsonMode } = req.body as {
    messages:          { role: 'user' | 'model'; parts: [{ text: string }] }[];
    systemInstruction?: string;
    jsonMode?:          boolean;
  };

  const body: Record<string, unknown> = { contents: messages };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }
  if (jsonMode) {
    body.generationConfig = { response_mime_type: 'application/json' };
  }

  const geminiRes = await fetch(`${BASE_URL}:generateContent?key=${apiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!geminiRes.ok) {
    res.status(geminiRes.status).json({ error: `Gemini error: ${geminiRes.status}` });
    return;
  }

  const data = await geminiRes.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  res.json({ text });
});

export default router;
