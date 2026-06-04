/// <reference types="@cloudflare/workers-types" />

interface Env {
  VIBEPLAN_KV: KVNamespace;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const GROUP_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let prompt: string, parsedPrompt: unknown;
  try {
    const body = await context.request.json() as { prompt?: string; parsedPrompt?: unknown };
    prompt = body.prompt ?? '';
    parsedPrompt = body.parsedPrompt;
    if (!prompt || !parsedPrompt) throw new Error('missing fields');
  } catch {
    return json({ error: 'prompt and parsedPrompt are required' }, 400);
  }

  const kv = context.env.VIBEPLAN_KV;

  // Generate a unique code (retry on the rare collision)
  let code = '';
  for (let attempts = 0; attempts < 10; attempts++) {
    const candidate = `VP-${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await kv.get(candidate);
    if (!existing) { code = candidate; break; }
  }
  if (!code) return json({ error: 'Could not generate unique code' }, 500);

  const group = {
    id: crypto.randomUUID(),
    code,
    prompt,
    parsedPrompt,
    constraints: [],
    votes: [],
    createdAt: Date.now(),
  };

  await kv.put(code, JSON.stringify(group), { expirationTtl: GROUP_TTL_SECONDS });

  return json({ code, id: group.id });
};
