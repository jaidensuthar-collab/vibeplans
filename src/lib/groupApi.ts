import { ParsedPrompt, GroupConstraint, Vote } from './types';

export interface StoredGroup {
  id: string;
  code: string;
  prompt: string;
  parsedPrompt: ParsedPrompt;
  constraints: GroupConstraint[];
  votes: Vote[];
  winningActivityId?: string;
  createdAt: number;
}

export async function apiCreateGroup(
  prompt: string,
  parsedPrompt: ParsedPrompt
): Promise<{ code: string; id: string }> {
  const res = await fetch('/api/group-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, parsedPrompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function apiGetGroup(code: string): Promise<StoredGroup> {
  const res = await fetch(
    `/api/group-get?code=${encodeURIComponent(code.toUpperCase().trim())}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function apiUpdateGroup(
  code: string,
  options: { constraint?: GroupConstraint; vote?: Vote }
): Promise<StoredGroup> {
  const res = await fetch('/api/group-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, ...options }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
