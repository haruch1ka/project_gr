import * as SecureStore from 'expo-secure-store';

const MODEL = 'gemini-2.0-flash';

export async function chat(prompt: string, context: string = ''): Promise<string> {
  const apiKey = await SecureStore.getItemAsync('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Gemini API Key未設定');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: context ? `${context}\n\n${prompt}` : prompt }],
          },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function saveGeminiKey(apiKey: string) {
  await SecureStore.setItemAsync('GEMINI_API_KEY', apiKey);
}
