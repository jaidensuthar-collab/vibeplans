from pydantic import BaseModel, ConfigDict


class WarningBadge(BaseModel):
    type: str
    reason: str


class Activity(BaseModel):
    id: str
    title: str
    summary: str
    vibes: list[str]
    estimatedCostMin: int
    estimatedCostMax: int
    timeNeeded: str
    distanceType: str
    bestFor: str
    effortLevel: str
    indoorOutdoor: str
    warnings: list[WarningBadge]
    planningNotes: str

    model_config = ConfigDict(populate_by_name=True)


class RankedActivity(BaseModel):
    activity: Activity
    score: int
    rankingReason: str


class GroupConstraint(BaseModel):
    memberId: str
    name: str
    maxBudget: int | None = None
    maxDistanceMinutes: int | None = None


class Vote(BaseModel):
    memberId: str
    activityId: str


class Group(BaseModel):
    id: str
    code: str
    prompt: str
    constraints: list[GroupConstraint]
    topActivities: list[RankedActivity]
    votes: list[Vote]
    winningActivityId: str | None = None


class ImprovedPlan(BaseModel):
    activityTitle: str
    polishedPlan: str
    nearbyOptions: list[str]
    backupPlan: str


# ── Request bodies ──────────────────────────────────────────────────────────

class RankRequest(BaseModel):
    prompt: str


class CreateGroupRequest(BaseModel):
    prompt: str


class VoteRequest(BaseModel):
    memberId: str
    activityId: str
