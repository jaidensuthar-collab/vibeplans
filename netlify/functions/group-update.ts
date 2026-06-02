import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let code: string, constraint: unknown, vote: unknown;
  try {
    ({ code, constraint, vote } = JSON.parse(event.body || '{}'));
    if (!code) throw new Error('missing code');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'code is required' }) };
  }

  const store = getStore('vibeplan-groups');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const group = await store.get(code, { type: 'json' }) as any;

  if (!group) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Group not found' }) };
  }

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

  await store.setJSON(code, group);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group),
  };
};
