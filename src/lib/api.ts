import { Activity, RankedActivity, Group, GroupConstraint, ImprovedPlan } from './types';

// In development Vite proxies /api → localhost:8000.
// In production the Vite build sets VITE_API_URL to the Render service URL.
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getActivities: () =>
    get<Activity[]>('/activities'),

  rankPrompt: (prompt: string) =>
    post<RankedActivity[]>('/rank', { prompt }),

  createGroup: (prompt: string) =>
    post<Group>('/groups', { prompt }),

  getGroup: (code: string) =>
    get<Group>(`/groups/${code}`),

  addConstraint: (code: string, constraint: GroupConstraint) =>
    post<Group>(`/groups/${code}/constraints`, constraint),

  vote: (code: string, memberId: string, activityId: string) =>
    post<Group>(`/groups/${code}/vote`, { memberId, activityId }),

  improvePlan: (code: string) =>
    post<ImprovedPlan>(`/groups/${code}/improve`),
};
