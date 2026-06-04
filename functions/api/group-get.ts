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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = (url.searchParams.get('code') ?? '').toUpperCase().trim();
  if (!code) return json({ error: 'code is required' }, 400);

  const raw = await context.env.VIBEPLAN_KV.get(code);
  if (!raw) {
    return json({ error: 'Group not found. Double-check the code and try again.' }, 404);
  }

  return json(JSON.parse(raw));
};
