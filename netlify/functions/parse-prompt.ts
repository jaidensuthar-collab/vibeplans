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
- distanceMinutes: max drive time in minutes. Convert ALL proximity phrases to numbers:
  - "walking distance", "walkable", "on foot", "right outside" → 5
  - "nearby", "close", "close by", "close-by", "right here", "near me", "local", "around here", "close to home", "stay close", "keep it close", "in the area" → 10
  - "not far", "not too far", "short drive", "quick drive", "don't want to drive much", "don't want to go far", "not trying to drive far", "no long drive", "stay local", "not going far" → 20
  - "within Austin", "in Austin", "around Austin", "in the city", "around town" → 40
  - "willing to drive", "open to driving", "don't mind driving", "down to drive", "anywhere" → null
  - "road trip", "far", "long drive", "hours away" → null (no limit)
  - If they say a specific number of minutes or miles, convert to minutes.
  - If they mention a specific Austin-area destination by name (e.g. "downtown", "downtown austin", "6th street", "east austin", "south congress", "rainey street", "barton springs", "lake travis", "steiner ranch", "domain"), set distanceMinutes to 40. These are specific places people want to GO TO — 40 min covers them from anywhere in the Austin metro.
  - null only if they truly don't care about distance.
- vibes: any combination of "chill", "random-adventure", "active", "creative", "social".
  - "chill" → relaxed, lazy, low-key, mellow, easy, take it easy, lounge, tired, peaceful, calm
  - "random-adventure" → bored, spontaneous, no idea, anything, explore, yolo, wild, surprise me, idk, don't know what to do
  - "active" → sporty, exercise, hiking, biking, swimming, physical, energetic, outdoors, workout, moving
  - "creative" → art, crafts, painting, music, cooking, pottery, DIY, make something
  - "social" → friends, hangout, party, games, fun, group activity, night out, people, together, squad
- effortLevel: "low" if easy/lazy/chill/no effort/relaxed, "high" if active/intense/workout/sporty/physical, "medium" otherwise. null if not clear.
- indoorOutdoor: "indoor" if inside/AC/out of heat/somewhere cool/air conditioned, "outdoor" if outside/nature/fresh air/open/at a park. null if not mentioned.
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
Output: {"budget":null,"distanceMinutes":40,"vibes":["social"],"effortLevel":null,"indoorOutdoor":null,"groupSize":6}

Input: "Don't want to drive far, something low key, just me and one friend"
Output: {"budget":null,"distanceMinutes":20,"vibes":["chill"],"effortLevel":"low","indoorOutdoor":null,"groupSize":2}

Input: "Idk what to do, not trying to drive, 4 of us, cheap"
Output: {"budget":10,"distanceMinutes":10,"vibes":["random-adventure","social"],"effortLevel":null,"indoorOutdoor":null,"groupSize":4}

Input: "Swimming or hiking near lake travis"
Output: {"budget":null,"distanceMinutes":40,"vibes":["active"],"effortLevel":"medium","indoorOutdoor":"outdoor","groupSize":null}

Input: "Something outside not too far, don't want to spend much"
Output: {"budget":15,"distanceMinutes":20,"vibes":["active"],"effortLevel":null,"indoorOutdoor":"outdoor","groupSize":null}

Input: "downtown austin 3 ppl 20$ each"
Output: {"budget":20,"distanceMinutes":40,"vibes":["social"],"effortLevel":null,"indoorOutdoor":null,"groupSize":3}

Input: "Something on 6th street, 4 of us, $30 budget"
Output: {"budget":30,"distanceMinutes":40,"vibes":["social"],"effortLevel":null,"indoorOutdoor":null,"groupSize":4}`;

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
