import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async (event) => {
  const code = (event.queryStringParameters?.code ?? '').toUpperCase().trim();
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: 'code is required' }) };
  }

  const store = getStore('vibeplan-groups');
  const group = await store.get(code, { type: 'json' });

  if (!group) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Group not found. Double-check the code and try again.' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group),
  };
};
