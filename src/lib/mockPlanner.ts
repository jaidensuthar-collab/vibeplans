import { activities } from '../data/activities';
import { Activity, EffortLevel, IndoorOutdoor, ParsedPrompt, RankedActivity, Vibe, GroupConstraint, ImprovedPlan } from './types';

// ─────────────────────────── keyword maps ────────────────────────────────────

const BUDGET_KEYWORDS: Record<string, number> = {
  // Zero / free
  free: 0, 'no money': 0, 'no cash': 0, 'no cost': 0, 'dont have money': 0, "don't have money": 0,
  broke: 3, 'no budget': 3, pennies: 3, 'dirt cheap': 3,
  // Cheap
  cheap: 10, 'low budget': 10, 'on a budget': 10, 'budget friendly': 12,
  tight: 10, 'not much': 10, 'a little': 10, 'not a lot': 10, 'very little': 8,
  affordable: 15, reasonable: 20, 'not expensive': 15,
  // Dollar amounts (also parsed by regex in parsePrompt)
  '$5': 5, '$10': 10, '$15': 15, '$20': 20, '$25': 25,
  '$30': 30, '$40': 40, '$50': 50, '$75': 75, '$100': 100,
  // Higher spend
  splurge: 75, fancy: 60, expensive: 60, 'going all out': 100, 'no limit': 999,
};

const VIBE_KEYWORDS: Record<string, Vibe> = {
  // ── Chill ──
  chill: 'chill', relax: 'chill', relaxed: 'chill', relaxing: 'chill',
  lowkey: 'chill', 'low key': 'chill', 'low-key': 'chill', calm: 'chill',
  easy: 'chill', lazy: 'chill', mellow: 'chill', slow: 'chill',
  vibe: 'chill', tired: 'chill', lounge: 'chill', cozy: 'chill', quiet: 'chill',
  'no effort': 'chill', 'low effort': 'chill', 'take it easy': 'chill',
  comfy: 'chill', comfortable: 'chill', restful: 'chill', kick: 'chill',

  // ── Random Adventure ──
  random: 'random-adventure', adventure: 'random-adventure', adventurous: 'random-adventure',
  spontaneous: 'random-adventure', explore: 'random-adventure', exploring: 'random-adventure',
  wild: 'random-adventure', surprise: 'random-adventure', yolo: 'random-adventure',
  bored: 'random-adventure', boring: 'random-adventure', anything: 'random-adventure',
  'no idea': 'random-adventure', 'not sure': 'random-adventure', 'dont know': 'random-adventure',
  "don't know": 'random-adventure', exciting: 'random-adventure', 'mix it up': 'random-adventure',
  thrill: 'random-adventure', unexpected: 'random-adventure', unusual: 'random-adventure',
  spontaneously: 'random-adventure', discover: 'random-adventure',

  // ── Active ──
  active: 'active', sporty: 'active', energetic: 'active',
  outdoors: 'active', outdoor: 'active', outside: 'active',
  exercise: 'active', workout: 'active', sports: 'active', physical: 'active',
  run: 'active', running: 'active', hike: 'active', hiking: 'active',
  bike: 'active', biking: 'active', swim: 'active', swimming: 'active',
  nature: 'active', 'go outside': 'active', athletic: 'active',
  fitness: 'active', sweat: 'active', moving: 'active',

  // ── Creative ──
  creative: 'creative', artsy: 'creative', art: 'creative', craft: 'creative',
  crafts: 'creative', paint: 'creative', painting: 'creative', draw: 'creative',
  drawing: 'creative', music: 'creative', cook: 'creative', cooking: 'creative',
  bake: 'creative', baking: 'creative', diy: 'creative', create: 'creative',
  pottery: 'creative', sculpt: 'creative', handmade: 'creative',

  // ── Social ──
  social: 'social', hangout: 'social', 'hang out': 'social', 'hanging out': 'social',
  friends: 'social', friend: 'social', fun: 'social', party: 'social',
  people: 'social', together: 'social', squad: 'social', crew: 'social',
  gang: 'social', everyone: 'social', games: 'social', game: 'social',
  night: 'social', evening: 'social', laugh: 'social', laughing: 'social',
  funny: 'social', hang: 'social', bonding: 'social', meetup: 'social',
  'meet up': 'social', group: 'social',
};

const DISTANCE_KEYWORDS: Record<string, number> = {
  // Very close
  'walking distance': 5, 'on foot': 5, walkable: 5,
  walking: 5, nearby: 10, close: 10, near: 10, local: 15, 'down the street': 5,
  // Specific time phrases
  '5 min': 5, '10 min': 10, '15 min': 15, '20 min': 20,
  '25 min': 25, '30 min': 30, '45 min': 45, '1 hour': 60,
  // Descriptive phrases
  'not far': 15, 'not too far': 20, 'not that far': 20,
  'within austin': 25, 'in austin': 25, 'around here': 20, 'around town': 20,
  // Far / open
  far: 60, anywhere: 999, 'road trip': 120, roadtrip: 120,
  'long drive': 90, 'willing to drive': 60, 'far away': 60,
};

// ─────────────── effort level keywords ──────────────────────────────────────

const EFFORT_KEYWORDS: Record<string, EffortLevel> = {
  // Low effort
  easy: 'low', lazy: 'low', 'low effort': 'low', 'low-effort': 'low', 'no effort': 'low',
  relaxed: 'low', 'laid back': 'low', 'laid-back': 'low', simple: 'low', light: 'low',
  effortless: 'low', minimal: 'low', 'nothing intense': 'low', 'take it easy': 'low',
  chill: 'low', lowkey: 'low', 'low key': 'low', 'low-key': 'low', mellow: 'low',
  // High effort
  active: 'high', energetic: 'high', intense: 'high', workout: 'high', exercise: 'high',
  'high effort': 'high', 'high-effort': 'high', physical: 'high', strenuous: 'high',
  athletic: 'high', challenging: 'high', 'high energy': 'high', sweat: 'high',
  sporty: 'high', vigorous: 'high', hardcore: 'high', 'work up a sweat': 'high',
  // Medium (less common to specify but handle it)
  moderate: 'medium', 'medium effort': 'medium', balanced: 'medium',
};

// ─────────────── indoor / outdoor keywords ───────────────────────────────────

const INDOOR_OUTDOOR_KEYWORDS: Record<string, IndoorOutdoor> = {
  // Indoor
  inside: 'indoor', indoors: 'indoor', indoor: 'indoor',
  'air conditioning': 'indoor', 'air conditioned': 'indoor', 'stay inside': 'indoor',
  'out of heat': 'indoor', 'out of the heat': 'indoor', 'out of the sun': 'indoor',
  'inside somewhere': 'indoor', 'somewhere inside': 'indoor', 'in the ac': 'indoor',
  // Outdoor
  outside: 'outdoor', outdoors: 'outdoor', outdoor: 'outdoor',
  'fresh air': 'outdoor', 'open air': 'outdoor', nature: 'outdoor',
  'go outside': 'outdoor', 'be outside': 'outdoor', 'get outside': 'outdoor',
  'open space': 'outdoor', 'outside somewhere': 'outdoor',
};

// ─────────── direct activity keyword boosts ──────────────────────────────────
// If the user's prompt contains any entry in `words`, activities whose
// title/id contains any entry in `fragments` get a score bonus of `weight`.
const ACTIVITY_KEYWORDS: Array<{ words: string[]; fragments: string[]; weight: number }> = [
  { words: ['bowling'], fragments: ['bowling'], weight: 55 },
  { words: ['escape room', 'escape'], fragments: ['escape-room', 'escape room'], weight: 55 },
  { words: ['movie', 'movies', 'film', 'cinema', 'theater', 'theatre'], fragments: ['movie', 'drive-in', 'film', 'theater', 'cinema'], weight: 50 },
  { words: ['hike', 'hiking', 'trail', 'trails'], fragments: ['hike', 'hiking', 'trail', 'greenbelt', 'barton creek'], weight: 50 },
  { words: ['food', 'eat', 'dinner', 'lunch', 'hungry', 'restaurant'], fragments: ['food', 'taco', 'pizza', 'bbq', 'burger', 'ramen', 'sushi', 'dining', 'eat'], weight: 40 },
  { words: ['bar', 'bars', 'drinks', 'drinking', 'drink', 'brewery'], fragments: ['bar', 'brewery', 'drink', 'rooftop', 'sixth-street', 'sixth street'], weight: 50 },
  { words: ['coffee', 'cafe', 'coffeehouse', 'coffeeshop'], fragments: ['coffee', 'cafe', 'coffeehouse'], weight: 55 },
  { words: ['pool', 'swim', 'swimming', 'lake', 'barton', 'springs'], fragments: ['pool', 'lake', 'swim', 'barton', 'spring', 'river'], weight: 50 },
  { words: ['golf', 'mini golf', 'miniature golf', 'putt', 'topgolf'], fragments: ['golf', 'topgolf'], weight: 55 },
  { words: ['karaoke'], fragments: ['karaoke'], weight: 60 },
  { words: ['arcade', 'arcades', 'gaming', 'video games'], fragments: ['arcade', 'gaming'], weight: 50 },
  { words: ['board game', 'board games', 'card game'], fragments: ['board-game', 'board game', 'card game'], weight: 55 },
  { words: ['trivia', 'quiz night', 'pub quiz'], fragments: ['trivia', 'quiz'], weight: 60 },
  { words: ['paint', 'painting', 'paint night', 'pottery'], fragments: ['paint', 'pottery', 'ceramics'], weight: 52 },
  { words: ['park', 'parks', 'greenspace', 'green space'], fragments: ['park', 'trail', 'greenway', 'green'], weight: 35 },
  { words: ['music', 'concert', 'live music', 'show', 'band'], fragments: ['music', 'concert', 'live', 'sixth-street', 'venue'], weight: 45 },
  { words: ['comedy', 'standup', 'stand-up', 'stand up', 'comedian'], fragments: ['comedy', 'stand-up', 'standup'], weight: 55 },
  { words: ['climbing', 'rock climbing', 'bouldering'], fragments: ['climbing', 'boulder', 'rock-climb'], weight: 60 },
  { words: ['laser tag', 'laser'], fragments: ['laser-tag', 'laser tag'], weight: 55 },
  { words: ['go kart', 'go-kart', 'gokart', 'kart', 'karting', 'racing'], fragments: ['go-kart', 'kart', 'racing', 'speedway'], weight: 58 },
  { words: ['trampoline', 'bounce house', 'skyzone', 'sky zone'], fragments: ['trampoline', 'bounce', 'jump'], weight: 58 },
  { words: ['axe throwing', 'axe', 'hatchet'], fragments: ['axe', 'hatchet', 'throwing'], weight: 58 },
  { words: ['pottery', 'ceramics', 'clay'], fragments: ['pottery', 'ceramic', 'clay'], weight: 60 },
  { words: ['cooking class', 'cook class'], fragments: ['cooking-class', 'cooking class'], weight: 50 },
  { words: ['picnic'], fragments: ['picnic'], weight: 55 },
  { words: ['camping', 'camp', 'campfire', 'smores', "s'mores"], fragments: ['camp', 'campfire', 'smores'], weight: 55 },
  { words: ['kayak', 'kayaking', 'canoe', 'canoeing', 'paddleboard', 'paddle'], fragments: ['kayak', 'paddle', 'canoe'], weight: 55 },
  { words: ['disc golf', 'frisbee golf', 'frisbee disc'], fragments: ['disc-golf', 'disc golf'], weight: 60 },
  { words: ['scavenger hunt', 'geocaching', 'geocache'], fragments: ['scavenger', 'geocach'], weight: 55 },
  { words: ['spa', 'massage', 'facial', 'self care'], fragments: ['spa', 'massage', 'float'], weight: 55 },
  { words: ['museum', 'gallery', 'exhibit', 'art museum'], fragments: ['museum', 'gallery', 'exhibit'], weight: 55 },
  { words: ['thrift', 'thrifting', 'vintage', 'antique', 'secondhand', 'shopping'], fragments: ['thrift', 'vintage', 'antique', 'market'], weight: 48 },
  { words: ['murder mystery', 'mystery dinner'], fragments: ['murder-mystery', 'murder mystery'], weight: 60 },
  { words: ['hammock', 'hammocking'], fragments: ['hammock'], weight: 55 },
  { words: ['skate', 'skateboard', 'skating', 'skatepark'], fragments: ['skate'], weight: 55 },
  { words: ['football', 'soccer', 'basketball', 'volleyball', 'pickup game'], fragments: ['football', 'soccer', 'basketball', 'volleyball', 'pickup'], weight: 50 },
  { words: ['stargazing', 'stars', 'star gazing', 'night sky'], fragments: ['star', 'astro', 'observatory'], weight: 55 },
  { words: ['photography', 'photoshoot', 'photo walk'], fragments: ['photo', 'photography'], weight: 50 },
  { words: ['boat', 'sailing', 'lake austin', 'lake travis'], fragments: ['boat', 'sail', 'cruise', 'lake-travis', 'lake-austin'], weight: 55 },
  { words: ['zipline', 'zip line', 'zip lining'], fragments: ['zipline', 'zip-line'], weight: 58 },
  { words: ['midnight run', 'late night', 'night drive'], fragments: ['midnight', 'late-night', 'night-drive'], weight: 45 },
  { words: ['sunrise', 'dawn', 'morning hike'], fragments: ['sunrise', 'morning', 'dawn'], weight: 45 },
  { words: ['road trip', 'long drive', 'drive somewhere'], fragments: ['road-trip', 'big-bend', 'hill-country'], weight: 48 },
  { words: ['hammock', 'relax outside', 'lay outside'], fragments: ['hammock-day'], weight: 55 },
  { words: ['frisbee', 'throw disc'], fragments: ['disc-golf', 'frisbee'], weight: 48 },
  { words: ['putt putt', 'mini golf', 'miniature golf'], fragments: ['mini-golf', 'putt'], weight: 58 },
];

// ─────────────────────────── parsePrompt ─────────────────────────────────────

export function parsePrompt(raw: string): ParsedPrompt {
  const lower = raw.toLowerCase();
  let budget: number | undefined;
  let distanceMinutes: number | undefined;
  let effortLevel: EffortLevel | undefined;
  let indoorOutdoor: IndoorOutdoor | undefined;
  const vibes: Vibe[] = [];

  // Dollar amount regex: "$20", "$15 each", "15 dollars", "15 bucks"
  const dollarMatch = lower.match(/\$(\d+)/g);
  if (dollarMatch) {
    budget = Math.max(...dollarMatch.map(d => parseInt(d.replace('$', ''))));
  }
  // "20 dollars" / "20 bucks" / "20 each" (without $)
  if (budget === undefined) {
    const buckMatch = lower.match(/(\d+)\s*(?:dollars?|bucks?|each)/);
    if (buckMatch) budget = parseInt(buckMatch[1]);
  }
  // Budget keywords (multi-word first, then single)
  for (const [kw, val] of Object.entries(BUDGET_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
    if (budget === undefined && lower.includes(kw)) budget = val;
  }

  // Distance: "20 min", "20 minutes", "20-minute"
  const minMatch = lower.match(/(\d+)\s*[-\s]?min(?:ute)?s?/);
  if (minMatch) distanceMinutes = parseInt(minMatch[1]);
  // Distance keywords (multi-word first)
  for (const [kw, val] of Object.entries(DISTANCE_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
    if (distanceMinutes === undefined && lower.includes(kw)) distanceMinutes = val;
  }
  // Cap "anywhere" sentinel so it never filters anything out
  if (distanceMinutes !== undefined && distanceMinutes >= 999) distanceMinutes = undefined;

  // Vibe keywords (multi-word phrases first, then single words)
  for (const [kw, vibe] of Object.entries(VIBE_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
    if (lower.includes(kw) && !vibes.includes(vibe)) vibes.push(vibe);
  }

  // Effort level keywords (multi-word first)
  for (const [kw, level] of Object.entries(EFFORT_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
    if (effortLevel === undefined && lower.includes(kw)) effortLevel = level;
  }

  // Indoor / outdoor keywords (multi-word first)
  for (const [kw, loc] of Object.entries(INDOOR_OUTDOOR_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
    if (indoorOutdoor === undefined && lower.includes(kw)) indoorOutdoor = loc;
  }

  // Group size
  const groupMatch = lower.match(/(\d+)\s*(?:people|person|of us|friends|guys)/);
  const groupSize = groupMatch ? parseInt(groupMatch[1]) : undefined;

  return { budget, distanceMinutes, vibes, groupSize, effortLevel, indoorOutdoor, rawText: raw };
}

// ─────────────────────────── scoring helpers ─────────────────────────────────

const DISTANCE_MINUTES: Record<string, number> = {
  walking: 5, nearby: 10, 'short-drive': 25, 'road-trip': 90,
};

function calcDistanceScore(activity: Activity, maxMinutes?: number): number {
  const actMin = DISTANCE_MINUTES[activity.distanceType] ?? 25;
  if (maxMinutes === undefined) return 5; // neutral — no constraint given
  if (actMin <= maxMinutes) return 20;
  if (actMin <= maxMinutes * 1.25) return 3; // slightly over limit
  return -20; // way over limit
}

function calcBudgetScore(activity: Activity, budget?: number): number {
  if (budget === undefined) return 5; // neutral
  if (activity.estimatedCostMax <= budget) return 25;
  if (activity.estimatedCostMin <= budget) return 8;
  return -25;
}

function calcVibeScore(activity: Activity, vibes: Vibe[]): number {
  if (vibes.length === 0) return 5; // neutral
  const matches = vibes.filter(v => activity.vibes.includes(v)).length;
  if (matches === 0) return -5; // vibes were specified but this activity doesn't match
  return matches * 20; // strong signal when vibes match
}

function calcWarningPenalty(activity: Activity): number {
  return activity.warnings.length * -4;
}

function calcEffortScore(activity: Activity, effortLevel?: EffortLevel): number {
  if (effortLevel === undefined) return 0; // no preference stated
  if (activity.effortLevel === effortLevel) return 22;       // exact match
  // Adjacent levels are ok; opposite is penalized
  const levels: EffortLevel[] = ['low', 'medium', 'high'];
  const gap = Math.abs(levels.indexOf(activity.effortLevel) - levels.indexOf(effortLevel));
  if (gap === 1) return 4;   // adjacent (e.g. asked low, got medium)
  return -22;                // opposite (asked low, got high)
}

function calcIndoorOutdoorScore(activity: Activity, indoorOutdoor?: IndoorOutdoor): number {
  if (indoorOutdoor === undefined) return 0;
  if (activity.indoorOutdoor === 'both') return 8;         // 'both' works for any preference
  if (activity.indoorOutdoor === indoorOutdoor) return 18; // exact match
  return -18;                                               // mismatch
}

/** Returns a small random jitter to break ties with variety. */
function jitter(): number {
  return Math.random() * 6 - 3; // ±3 points
}

/** Keyword-based direct boost: +weight when user mentions an activity by name/category. */
function calcKeywordBoost(activity: Activity, lowerPrompt: string): number {
  const titleLower = activity.title.toLowerCase();
  const idLower = activity.id.toLowerCase();
  let boost = 0;

  for (const { words, fragments, weight } of ACTIVITY_KEYWORDS) {
    const userMentioned = words.some(w => lowerPrompt.includes(w));
    if (!userMentioned) continue;
    const activityMatches = fragments.some(
      f => titleLower.includes(f) || idLower.includes(f)
    );
    if (activityMatches) boost += weight;
  }

  return boost;
}

// ─────────────────────────── rank functions ──────────────────────────────────

export function rankActivities(
  prompt: ParsedPrompt,
  pool: Activity[] = activities,
  topN = 5
): RankedActivity[] {
  const lowerPrompt = prompt.rawText.toLowerCase();

  const scored = pool.map(activity => {
    const score =
      40 +
      calcBudgetScore(activity, prompt.budget) +
      calcDistanceScore(activity, prompt.distanceMinutes) +
      calcVibeScore(activity, prompt.vibes) +
      calcEffortScore(activity, prompt.effortLevel) +
      calcIndoorOutdoorScore(activity, prompt.indoorOutdoor) +
      calcKeywordBoost(activity, lowerPrompt) +
      calcWarningPenalty(activity) +
      jitter();

    // Build human-readable reason
    const reasons: string[] = [];
    if (prompt.budget !== undefined && activity.estimatedCostMax <= prompt.budget)
      reasons.push(`fits your $${prompt.budget} budget`);
    if (prompt.distanceMinutes !== undefined) {
      const actMin = DISTANCE_MINUTES[activity.distanceType] ?? 25;
      if (actMin <= prompt.distanceMinutes) reasons.push('within your drive limit');
    }
    const matchedVibes = prompt.vibes.filter(v => activity.vibes.includes(v));
    if (matchedVibes.length > 0) reasons.push(`matches ${matchedVibes.join(' & ')} vibe`);
    if (prompt.effortLevel !== undefined && activity.effortLevel === prompt.effortLevel)
      reasons.push(`${prompt.effortLevel} effort`);
    if (prompt.indoorOutdoor !== undefined && (activity.indoorOutdoor === prompt.indoorOutdoor || activity.indoorOutdoor === 'both'))
      reasons.push(prompt.indoorOutdoor === 'indoor' ? 'indoors' : 'outdoors');
    if (prompt.effortLevel === undefined && activity.effortLevel === 'low') reasons.push('easy to coordinate');
    if (reasons.length === 0) reasons.push('solid all-around option');

    return {
      activity,
      score,
      rankingReason: `Ranked because it ${reasons.join(', ')}.`,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export function rankWithConstraints(
  rawOrParsed: string | ParsedPrompt,
  constraints: GroupConstraint[]
): RankedActivity[] {
  const base = typeof rawOrParsed === 'string' ? parsePrompt(rawOrParsed) : rawOrParsed;
  const budgets = constraints.map(c => c.maxBudget).filter((b): b is number => b !== undefined);
  const distances = constraints.map(c => c.maxDistanceMinutes).filter((d): d is number => d !== undefined);
  const merged: ParsedPrompt = {
    ...base,
    budget: budgets.length > 0 ? Math.min(...budgets, base.budget ?? Infinity) : base.budget,
    distanceMinutes: distances.length > 0
      ? Math.min(...distances, base.distanceMinutes ?? Infinity)
      : base.distanceMinutes,
  };
  return rankActivities(merged);
}

// ─────────────────────────── AI-powered parser ───────────────────────────────

/**
 * Sends the user's raw text to the Netlify serverless function which calls
 * GPT-4o-mini to extract structured categories. Falls back to local keyword
 * matching if the function is unavailable or returns an error.
 */
export async function parsePromptAI(raw: string): Promise<ParsedPrompt> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch('/.netlify/functions/parse-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: raw }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return {
      budget: data.budget,
      distanceMinutes: data.distanceMinutes,
      vibes: data.vibes ?? [],
      effortLevel: data.effortLevel,
      indoorOutdoor: data.indoorOutdoor,
      groupSize: data.groupSize,
      rawText: raw,
    };
  } catch (err) {
    console.warn('AI parse failed, falling back to keyword matching:', err);
    return parsePrompt(raw);
  }
}

export function generateImprovedPlan(ranked: RankedActivity, constraints: GroupConstraint[]): ImprovedPlan {
  const { activity } = ranked;
  const minBudgets = constraints.map(c => c.maxBudget).filter((b): b is number => b !== undefined);
  const budgetNote = minBudgets.length > 0
    ? `under $${Math.min(...minBudgets)} per person`
    : `around $${activity.estimatedCostMax} per person`;

  return {
    activityTitle: activity.title,
    polishedPlan: `Meet up and head out for ${activity.title.toLowerCase()}. Keep costs ${budgetNote} and stay within ${activity.distanceType === 'nearby' ? '15 minutes' : '25 minutes'} of your starting point. Plan for ${activity.timeNeeded} and keep it low-key — ${activity.summary.toLowerCase()}`,
    nearbyOptions: [
      'Local park or green space',
      'Nearby shopping center or strip',
      'Scenic outdoor spot or overlook',
    ],
    backupPlan: activity.indoorOutdoor === 'outdoor'
      ? 'If weather turns bad, switch to a coffee shop, board game night, or car playlist drive instead.'
      : 'If the main spot is full or closed, pick the next closest option on the list.',
  };
}
