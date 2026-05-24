export type Vibe = 'chill' | 'random-adventure' | 'active' | 'creative' | 'social';

export type DistanceType = 'walking' | 'nearby' | 'short-drive' | 'road-trip';

export type EffortLevel = 'low' | 'medium' | 'high';

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both';

export type WarningType =
  | 'late-night'
  | 'needs-ride'
  | 'cost-risk'
  | 'weather-risk'
  | 'far-drive'
  | 'planning-needed';

export interface WarningBadge {
  type: WarningType;
  reason: string;
}

export interface Activity {
  id: string;
  title: string;
  summary: string;
  vibes: Vibe[];
  estimatedCostMin: number;
  estimatedCostMax: number;
  timeNeeded: string;
  distanceType: DistanceType;
  bestFor: string;
  effortLevel: EffortLevel;
  indoorOutdoor: IndoorOutdoor;
  warnings: WarningBadge[];
  planningNotes: string;
}

export interface RankedActivity {
  activity: Activity;
  score: number;
  rankingReason: string;
}

export interface ParsedPrompt {
  budget?: number;
  distanceMinutes?: number;
  vibes: Vibe[];
  groupSize?: number;
  rawText: string;
}

export interface GroupConstraint {
  memberId: string;
  name: string;
  maxBudget?: number;
  maxDistanceMinutes?: number;
  unavailableVibes?: Vibe[];
}

export interface Vote {
  memberId: string;
  activityId: string;
}

export interface Group {
  id: string;
  code: string;
  prompt: string;
  constraints: GroupConstraint[];
  topActivities: RankedActivity[];
  votes: Vote[];
  winningActivityId?: string;
  improvedPlan?: ImprovedPlan;
}

export interface ImprovedPlan {
  activityTitle: string;
  polishedPlan: string;
  nearbyOptions: string[];
  backupPlan: string;
}
