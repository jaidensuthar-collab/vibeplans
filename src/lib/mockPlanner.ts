// activities.ts is lazy-loaded on first ranking call so it lands in its own
// split chunk and is excluded from the initial JS bundle.
let _activitiesCache: Activity[] | null = null;
async function loadActivities(): Promise<Activity[]> {
  if (!_activitiesCache) {
    const mod = await import('../data/activities');
    _activitiesCache = mod.activities;
  }
  return _activitiesCache;
}
import { Activity, EffortLevel, IndoorOutdoor, ParsedPrompt, RankedActivity, Vibe, GroupConstraint, ImprovedPlan } from './types';
import { getActivityDriveMinutes, haversineDistanceMiles } from './distance';
import { ACTIVITY_LOCATIONS } from '../data/activity-locations';

export type UserLocation = { lat: number; lon: number };

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
  // Austin metro / destination location names → generous limit so downtown activities aren't filtered out
  downtown: 40, 'downtown austin': 40, '6th street': 40, 'east austin': 40,
  'south congress': 40, 'rainey street': 40, 'the domain': 40,
  'within austin': 40, 'in austin': 40, 'around here': 15, 'around town': 30,
  // "don't want to drive" / "stay close" phrases
  "don't want to drive": 10, 'dont want to drive': 10, 'not trying to drive': 10,
  "don't want to go far": 15, 'dont want to go far': 15,
  'stay close': 10, 'stay local': 15, 'keep it close': 10,
  'in the area': 15, 'close to home': 10, 'close to us': 10,
  'no long drive': 15, 'short drive': 20, 'quick drive': 15,
  'close by': 10, 'close-by': 10,
  // Far / open
  far: 60, anywhere: 999, 'road trip': 120, roadtrip: 120,
  'long drive': 90, 'willing to drive': 60, 'far away': 60,
  'open to driving': 60, 'down to drive': 60,
};

// ─────────────── named Austin location overrides ─────────────────────────────
// These are applied CLIENT-SIDE after the AI result arrives, so GPT can't ignore them.
// Each entry maps one or more phrases to a distanceMinutes value AND a human-readable
// label shown in the "I understood" chip instead of "within X min".

export interface LocationOverride {
  keywords: string[];
  distanceMinutes: number;
  label: string;
  /** Approximate geographic center of the area (used to boost nearby activities) */
  centerLat?: number;
  centerLon?: number;
  /** Miles radius that counts as "in this area" for the area bonus */
  radiusMiles?: number;
}

export const LOCATION_OVERRIDES: LocationOverride[] = [
  // Downtown / central Austin
  { keywords: ['downtown austin', 'downtown', '6th street', 'sixth street', 'rainey street', 'rainey st', '2nd street', 'second street', 'congress ave', 'congress avenue', 'west 6th', 'east 6th'], distanceMinutes: 40, label: 'Downtown Austin', centerLat: 30.2672, centerLon: -97.7431, radiusMiles: 4 },
  // South Austin / SoCo
  { keywords: ['south congress', 'soco', 'south lamar', 'travis heights', 'bouldin', 'st elmo', 'south austin'], distanceMinutes: 40, label: 'South Austin', centerLat: 30.2426, centerLon: -97.7648, radiusMiles: 4 },
  // East Austin
  { keywords: ['east austin', 'east side', 'east atx', 'east 11th', 'mueller'], distanceMinutes: 40, label: 'East Austin', centerLat: 30.2634, centerLon: -97.7202, radiusMiles: 4 },
  // North / Domain
  { keywords: ['the domain', 'domain northside', 'cedar park', 'leander', 'north austin'], distanceMinutes: 35, label: 'North Austin / Domain', centerLat: 30.4026, centerLon: -97.7167, radiusMiles: 5 },
  // Round Rock / Georgetown
  { keywords: ['round rock', 'pflugerville', 'pfluger', 'georgetown'], distanceMinutes: 40, label: 'Round Rock area', centerLat: 30.5083, centerLon: -97.6789, radiusMiles: 6 },
  // Barton Springs / Zilker
  { keywords: ['barton springs', 'barton creek', 'zilker', 'barton hills'], distanceMinutes: 40, label: 'Barton Springs area', centerLat: 30.2614, centerLon: -97.7711, radiusMiles: 3 },
  // Lady Bird Lake
  { keywords: ['lady bird lake', 'town lake', 'lady bird'], distanceMinutes: 40, label: 'Lady Bird Lake', centerLat: 30.2568, centerLon: -97.7508, radiusMiles: 3 },
  // Lake Travis / Steiner
  { keywords: ['lake travis', 'volente', 'lakeway', 'lago vista', 'steiner ranch', 'steiner'], distanceMinutes: 40, label: 'Lake Travis area', centerLat: 30.4167, centerLon: -97.9000, radiusMiles: 8 },
  // Buda / Kyle / San Marcos (south of Austin)
  { keywords: ['buda', 'kyle', 'san marcos', 'wimberley'], distanceMinutes: 50, label: 'South of Austin', centerLat: 30.0880, centerLon: -97.8400, radiusMiles: 10 },
  // General "in Austin" phrases — no center, don't penalize generic activities
  { keywords: ['in austin', 'within austin', 'around austin', 'in atx', 'around atx', 'in the city', 'around town'], distanceMinutes: 40, label: 'Austin area' },
];

/**
 * Scans rawText for named Austin location phrases and returns the matching override,
 * or null if no location keyword is found. Checks longest keywords first to avoid
 * partial matches (e.g. "downtown austin" before "downtown").
 */
export function detectLocationOverride(rawText: string): LocationOverride | null {
  const lower = rawText.toLowerCase();
  // Flatten all keywords with their parent override, sort longest first
  const entries: Array<{ kw: string; override: LocationOverride }> = [];
  for (const override of LOCATION_OVERRIDES) {
    for (const kw of override.keywords) {
      entries.push({ kw, override });
    }
  }
  entries.sort((a, b) => b.kw.length - a.kw.length);
  for (const { kw, override } of entries) {
    if (lower.includes(kw)) return override;
  }
  return null;
}

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

function resolveActivityMinutes(activity: Activity, userLocation?: UserLocation): number {
  // Use real GPS distance when available — most accurate
  if (userLocation) {
    const real = getActivityDriveMinutes(activity.id, userLocation.lat, userLocation.lon);
    if (real !== null) return real;
  }

  // No GPS available.
  // Fixed-location activities (in ACTIVITY_LOCATIONS) exist at a SPECIFIC place on the map.
  // Without GPS we don't know if that place is near the user, so we're conservative:
  // treat 'walking'/'nearby' as short-drive (25 min) and 'short-drive' as long (60 min).
  // Generic activities (NOT in ACTIVITY_LOCATIONS) truly can be found anywhere near the
  // user, so their stored distanceType is a reasonable estimate — keep it as-is.
  const hasFixedLocation = activity.id in ACTIVITY_LOCATIONS;
  if (hasFixedLocation) {
    const stored = DISTANCE_MINUTES[activity.distanceType] ?? 25;
    if (stored <= 10) return 25;  // was 'nearby'  → treat as short-drive
    if (stored <= 25) return 55;  // was 'short-drive' → treat as long drive
    return stored;                // road-trip stays road-trip
  }

  return DISTANCE_MINUTES[activity.distanceType] ?? 25;
}

function calcDistanceScore(activity: Activity, maxMinutes?: number, userLocation?: UserLocation): number {
  const actMin = resolveActivityMinutes(activity, userLocation);
  if (maxMinutes === undefined) {
    // No distance specified — prefer closer activities meaningfully so road-trips
    // don't dominate just because they match vibes well.
    if (actMin <= 5)  return 15;  // walking / at-home
    if (actMin <= 10) return 12;  // nearby (≤10 min)
    if (actMin <= 25) return 5;   // short drive (15–45 min)
    return -8;                    // road trip — needs strong vibe/keyword match to surface
  }
  if (actMin <= maxMinutes)          return 22;   // fits within limit
  if (actMin <= maxMinutes + 10)     return -5;   // within 10 min grace window
  if (actMin <= maxMinutes * 2)      return -30;  // moderately over — strong penalty
  return -55;                                      // way over — near elimination
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
  if (activity.effortLevel === effortLevel) return 35;       // exact match
  // Adjacent levels are ok; opposite is penalized
  const levels: EffortLevel[] = ['low', 'medium', 'high'];
  const gap = Math.abs(levels.indexOf(activity.effortLevel) - levels.indexOf(effortLevel));
  if (gap === 1) return 6;   // adjacent (e.g. asked low, got medium)
  return -35;                // opposite (asked low, got high)
}

/**
 * When the user didn't explicitly state an effort level but their *vibe* implies
 * one ("active" → high effort expected, "chill" → low effort expected), apply a
 * bonus/penalty so that, e.g., an "active" query doesn't surface lazy walks above
 * rock climbing just because both match the "active" vibe tag.
 *
 * Only fires when effortLevel is undefined — if the user DID state an effort level,
 * calcEffortScore already handles it with higher weights.
 */
function calcVibeImpliedEffortBonus(activity: Activity, vibes: Vibe[], effortLevel?: EffortLevel): number {
  if (effortLevel !== undefined) return 0; // explicit effort already handled

  const wantsActive = vibes.includes('active');
  const wantsChill  = vibes.includes('chill');

  // Conflicting signals (someone said both "active" and "chill") → neutral
  if (wantsActive && wantsChill) return 0;

  if (wantsActive) {
    if (activity.effortLevel === 'high')   return 20;  // perfect — gets moving
    if (activity.effortLevel === 'medium') return 5;   // acceptable
    if (activity.effortLevel === 'low')    return -20; // lazy pick for an active ask
  }

  if (wantsChill) {
    if (activity.effortLevel === 'low')    return 20;  // perfect — easy & relaxed
    if (activity.effortLevel === 'medium') return 0;   // acceptable
    if (activity.effortLevel === 'high')   return -20; // intense pick for a chill ask
  }

  return 0;
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

/**
 * Location area score: when the user named a specific Austin destination,
 * reward activities whose GPS coordinates are physically IN that area and
 * penalize generic activities (no fixed location) that could be done anywhere.
 *
 * Without this, cheap generic "nearby" activities dominate because they score
 * +22 distance and +25 budget — beating specific-location activities even when
 * the user explicitly asked for things at a particular place.
 */
function calcLocationAreaScore(activity: Activity, locOverride: LocationOverride | null): number {
  if (!locOverride || !locOverride.centerLat) return 0; // no named destination → no effect

  const loc = ACTIVITY_LOCATIONS[activity.id];

  if (!loc) {
    // Generic activity — no fixed location. When user asked for a specific place,
    // these are probably not what they want. Apply a penalty so area-specific
    // activities surface above generic ones.
    return -25;
  }

  // Activity has GPS coords — check how close it is to the requested area
  if (!locOverride.centerLat || !locOverride.centerLon) return 10; // has GPS but no area center defined
  const miles = haversineDistanceMiles(loc.lat, loc.lon, locOverride.centerLat, locOverride.centerLon);
  const radius = locOverride.radiusMiles ?? 5;

  if (miles <= radius)       return 40;  // right in the area → strong boost
  if (miles <= radius * 2)   return 15;  // nearby / adjacent → mild boost
  return -15;                            // fixed location but wrong part of Austin
}

// ─────────────────────────── rank functions ──────────────────────────────────

export function rankActivities(
  prompt: ParsedPrompt,
  pool: Activity[],
  topN = 5,
  userLocation?: UserLocation
): RankedActivity[] {
  const lowerPrompt = prompt.rawText.toLowerCase();
  const locOverride = detectLocationOverride(prompt.rawText);

  const scored = pool.map(activity => {
    const score =
      40 +
      calcBudgetScore(activity, prompt.budget) +
      calcDistanceScore(activity, prompt.distanceMinutes, userLocation) +
      calcVibeScore(activity, prompt.vibes) +
      calcEffortScore(activity, prompt.effortLevel) +
      calcVibeImpliedEffortBonus(activity, prompt.vibes, prompt.effortLevel) +
      calcIndoorOutdoorScore(activity, prompt.indoorOutdoor) +
      calcKeywordBoost(activity, lowerPrompt) +
      calcLocationAreaScore(activity, locOverride) +
      calcWarningPenalty(activity) +
      jitter();

    // Build human-readable reason
    const reasons: string[] = [];
    if (prompt.budget !== undefined && activity.estimatedCostMax <= prompt.budget)
      reasons.push(`fits your $${prompt.budget} budget`);
    if (prompt.distanceMinutes !== undefined) {
      const actMin = resolveActivityMinutes(activity, userLocation);
      if (actMin <= prompt.distanceMinutes) {
        // Show real drive time when we have GPS data
        const realMin = userLocation
          ? getActivityDriveMinutes(activity.id, userLocation.lat, userLocation.lon)
          : null;
        reasons.push(realMin !== null ? `~${realMin} min from you` : 'within your drive limit');
      }
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

  // Hard distance filter: when the user specified a limit, drop any activity that is
  // more than 2× over it. This prevents high vibe-match scores from surfacing
  // something physically way out of range. If filtering leaves too few results,
  // fall back to the full scored list so we always return something.
  let resultPool = scored;
  if (prompt.distanceMinutes !== undefined) {
    const hardLimit = prompt.distanceMinutes * 2;
    const hardFiltered = scored.filter(
      ({ activity: a }) => resolveActivityMinutes(a, userLocation) <= hardLimit
    );
    if (hardFiltered.length >= Math.min(topN, 3)) resultPool = hardFiltered;
  }

  return resultPool
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export async function rankActivitiesAsync(
  prompt: ParsedPrompt,
  topN = 5,
  userLocation?: UserLocation
): Promise<RankedActivity[]> {
  const pool = await loadActivities();
  return rankActivities(prompt, pool, topN, userLocation);
}

export async function rankWithConstraints(
  rawOrParsed: string | ParsedPrompt,
  constraints: GroupConstraint[],
  userLocation?: UserLocation
): Promise<RankedActivity[]> {
  const pool = await loadActivities();
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
  return rankActivities(merged, pool, 5, userLocation);
}

// ─────────────────────────── AI parse cache ──────────────────────────────────

const PARSE_CACHE_PREFIX = 'vp_parse_v1_';
const PARSE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const PARSE_CACHE_MAX_ENTRIES = 100;

interface CacheEntry {
  result: Omit<ParsedPrompt, 'rawText'>;
  ts: number;
}

function normalizeCacheKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCachedParse(raw: string): ParsedPrompt | null {
  try {
    const key = PARSE_CACHE_PREFIX + normalizeCacheKey(raw);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const { result, ts }: CacheEntry = JSON.parse(stored);
    if (Date.now() - ts > PARSE_CACHE_MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return { ...result, rawText: raw };
  } catch {
    return null;
  }
}

function setCachedParse(raw: string, result: ParsedPrompt): void {
  try {
    const key = PARSE_CACHE_PREFIX + normalizeCacheKey(raw);
    const entry: CacheEntry = {
      result: {
        budget: result.budget,
        distanceMinutes: result.distanceMinutes,
        vibes: result.vibes,
        effortLevel: result.effortLevel,
        indoorOutdoor: result.indoorOutdoor,
        groupSize: result.groupSize,
      },
      ts: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
    evictOldCacheEntries();
  } catch {
    // ignore — storage quota exceeded or private browsing blocked
  }
}

function evictOldCacheEntries(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PARSE_CACHE_PREFIX));
    if (keys.length <= PARSE_CACHE_MAX_ENTRIES) return;
    // Sort by timestamp ascending and remove the oldest ones
    const entries = keys
      .map(k => {
        try {
          const stored = localStorage.getItem(k);
          if (!stored) return null;
          const { ts }: CacheEntry = JSON.parse(stored);
          return { key: k, ts };
        } catch {
          return null;
        }
      })
      .filter((e): e is { key: string; ts: number } => e !== null)
      .sort((a, b) => a.ts - b.ts);
    const toRemove = entries.slice(0, entries.length - PARSE_CACHE_MAX_ENTRIES);
    for (const { key } of toRemove) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ─────────────────────────── AI-powered parser ───────────────────────────────

/**
 * Sends the user's raw text to the Netlify serverless function which calls
 * GPT-4o-mini to extract structured categories. Results are cached in
 * localStorage for 24 h so repeat (or near-identical) prompts never hit the
 * function twice — this is the main lever for staying inside Netlify's free
 * function invocation quota.
 *
 * Falls back to local keyword matching if the function is unavailable.
 */
export async function parsePromptAI(raw: string): Promise<ParsedPrompt> {
  // ── Cache check: same prompt text reuses last result without an API call ──
  const cached = getCachedParse(raw);
  if (cached) {
    // Still apply the location override in case the cached run predates this logic
    const locOverride = detectLocationOverride(raw);
    if (locOverride) cached.distanceMinutes = locOverride.distanceMinutes;
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch('/api/parse-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: raw }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const aiResult: ParsedPrompt = {
      budget: data.budget,
      distanceMinutes: data.distanceMinutes,
      vibes: data.vibes ?? [],
      effortLevel: data.effortLevel,
      indoorOutdoor: data.indoorOutdoor,
      groupSize: data.groupSize,
      rawText: raw,
    };

    // Client-side location override: GPT sometimes ignores instruction for specific
    // place names ("downtown austin" → 25 instead of 40). Detect named locations in
    // the raw text and forcibly correct distanceMinutes so ranking is always right.
    const locOverride = detectLocationOverride(raw);
    if (locOverride) {
      aiResult.distanceMinutes = locOverride.distanceMinutes;
    }

    // ── Persist to cache so this exact prompt skips the function next time ──
    setCachedParse(raw, aiResult);

    return aiResult;
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
