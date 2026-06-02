import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let prompt: string, parsedPrompt: unknown;
  try {
    ({ prompt, parsedPrompt } = JSON.parse(event.body || '{}'));
    if (!prompt || !parsedPrompt) throw new Error('missing fields');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'prompt and parsedPrompt are required' }) };
  }

  const store = getStore('vibeplan-groups');

  // Generate a unique code (retry on the rare collision)
  let code = '';
  for (let attempts = 0; attempts < 10; attempts++) {
    const candidate = `VP-${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await store.get(candidate);
    if (!existing) { code = candidate; break; }
  }
  if (!code) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not generate unique code' }) };
  }

  const group = {
    id: crypto.randomUUID(),
    code,
    prompt,
    parsedPrompt,
    constraints: [],
    votes: [],
    createdAt: Date.now(),
  };

  await store.setJSON(code, group);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, id: group.id }),
  };
};
