import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are a structured data extractor for a summer activity planning app called VibePlan.

Given the user's description of what they want to do, extract these fields and return ONLY a valid JSON object — no markdown, no explanation, nothing else:

{
  "budget": number | null,
  "distanceMinutes": number | null,
  "vibes": string[],
  "effortLevel": "low" | "medium" | "high" | null,
  "indoorOutdoor": "indoor" | "outdoor" | null,
  "groupSize": number | null
}

Field meanings:
- budget: max dollars per person. null if not mentioned or "no limit".
- distanceMinutes: max drive time in minutes. Convert vague distance words to numbers:
  - "walking distance", "walkable", "on foot" → 5
  - "nearby", "close", "close by", "right here", "near me", "local", "around here" → 10
  - "not far", "not too far", "short drive", "quick drive", "don't want to drive much" → 20
  - "within Austin", "in Austin", "around Austin", "in the city" → 25
  - "willing to drive", "don't mind driving", "anywhere" → null
  - "road trip", "far", "long drive" → null (no limit)
  - If they say a specific number of minutes, use that number exactly.
  - null only if they truly don't care about distance.
- vibes: any combination of "chill", "random-adventure", "active", "creative", "social".
  - "chill" → relaxed, lazy, low-key, mellow, easy, take it easy, lounge, tired
  - "random-adventure" → bored, spontaneous, no idea, anything, explore, yolo, wild, surprise me
  - "active" → sporty, exercise, hiking, biking, swimming, physical, energetic, outdoors
  - "creative" → art, crafts, painting, music, cooking, pottery, DIY
  - "social" → friends, hangout, party, games, fun, group activity, night out, people
- effortLevel: "low" if easy/lazy/chill/no effort, "high" if active/intense/workout/sporty, "medium" otherwise. null if not clear.
- indoorOutdoor: "indoor" if inside/AC/out of heat/somewhere cool, "outdoor" if outside/nature/fresh air/open. null if not mentioned.
- groupSize: total number of people including the person asking. null if not mentioned.

Include multiple vibes when appropriate. Return [] for vibes if none clearly fit.

Examples:
Input: "We're bored tonight, 5 people, $15 each, nothing more than 20 minutes away"
Output: {"budget":15,"distanceMinutes":20,"vibes":["random-adventure","social"],"effortLevel":null,"indoorOutdoor":null,"groupSize":5}

Input: "Something chill nearby, just 2 of us, stay inside"
Output: {"budget":null,"distanceMinutes":10,"vibes":["chill"],"effortLevel":"low","indoorOutdoor":"indoor","groupSize":2}

Input: "Active outdoor adventure, $50 each, willing to drive far, 4 friends"
Output: {"budget":50,"distanceMinutes":null,"vibes":["active","random-adventure"],"effortLevel":"high","indoorOutdoor":"outdoor","groupSize":4}

Input: "Random adventure close by, no idea what to do, 3 of us, cheap"
Output: {"budget":10,"distanceMinutes":10,"vibes":["random-adventure","social"],"effortLevel":null,"indoorOutdoor":null,"groupSize":3}

Input: "Something fun in Austin tonight, 6 people"
Output: {"budget":null,"distanceMinutes":25,"vibes":["social"],"effortLevel":null,"indoorOutdoor":null,"groupSize":6}

Input: "Don't want to drive far, something low key, just me and one friend"
Output: {"budget":null,"distanceMinutes":20,"vibes":["chill"],"effortLevel":"low","indoorOutdoor":null,"groupSize":2}`;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'OpenAI API key not configured' }),
    };
  }

  let rawText: string;
  try {
    ({ rawText } = JSON.parse(event.body || '{}'));
    if (!rawText || typeof rawText !== 'string') throw new Error('missing rawText');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'rawText required' }) };
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawText },
      ],
      max_tokens: 150,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    const VALID_VIBES = new Set(['chill', 'random-adventure', 'active', 'creative', 'social']);
    const VALID_EFFORT = new Set(['low', 'medium', 'high']);
    const VALID_LOCATION = new Set(['indoor', 'outdoor']);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budget: typeof parsed.budget === 'number' ? parsed.budget : undefined,
        distanceMinutes: typeof parsed.distanceMinutes === 'number' ? parsed.distanceMinutes : undefined,
        vibes: Array.isArray(parsed.vibes)
          ? parsed.vibes.filter((v: unknown) => typeof v === 'string' && VALID_VIBES.has(v))
          : [],
        effortLevel: typeof parsed.effortLevel === 'string' && VALID_EFFORT.has(parsed.effortLevel)
          ? parsed.effortLevel
          : undefined,
        indoorOutdoor: typeof parsed.indoorOutdoor === 'string' && VALID_LOCATION.has(parsed.indoorOutdoor)
          ? parsed.indoorOutdoor
          : undefined,
        groupSize: typeof parsed.groupSize === 'number' ? parsed.groupSize : undefined,
        rawText,
      }),
    };
  } catch (err) {
    console.error('parse-prompt function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to parse prompt with AI' }),
    };
  }
};
