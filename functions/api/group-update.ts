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
  let code: string, constraint: unknown, vote: unknown;
  try {
    const body = await context.request.json() as { code?: string; constraint?: unknown; vote?: unknown };
    code = (body.code ?? '').toUpperCase().trim();
    constraint = body.constraint;
    vote = body.vote;
    if (!code) throw new Error('missing code');
  } catch {
    return json({ error: 'code is required' }, 400);
  }

  const kv = context.env.VIBEPLAN_KV;
  const raw = await kv.get(code);
  if (!raw) return json({ error: 'Group not found' }, 404);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const group = JSON.parse(raw) as any;

  if (constraint) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = constraint as any;
    group.constraints = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...group.constraints.filter((x: any) => x.memberId !== c.memberId),
      c,
    ];
  }

  if (vote) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = vote as any;
    group.votes = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...group.votes.filter((x: any) => x.memberId !== v.memberId),
      v,
    ];
    // Recompute winner
    const counts: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    group.votes.forEach((x: any) => { counts[x.activityId] = (counts[x.activityId] ?? 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    group.winningActivityId = sorted.length > 0 ? sorted[0][0] : undefined;
  }

  // Refresh TTL on every write so active groups don't expire mid-session
  await kv.put(code, JSON.stringify(group), { expirationTtl: GROUP_TTL_SECONDS });

  return json(group);
};
