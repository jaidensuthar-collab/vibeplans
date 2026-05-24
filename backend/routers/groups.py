import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Group as GroupORM, Constraint as ConstraintORM, Vote as VoteORM
from ..schemas import Group, GroupConstraint, Vote, ImprovedPlan, CreateGroupRequest, VoteRequest
from ..mock_planner import rank_with_constraints, generate_improved_plan
from ..logger import get_logger

log = get_logger("vibeplan.routes.groups")
router = APIRouter(tags=["groups"])


def _generate_code() -> str:
    import random
    return f"VP-{random.randint(1000, 9999)}"


async def _load_group(code: str, db: AsyncSession) -> Group:
    log.debug("_load_group | code=%s", code)
    result = await db.execute(select(GroupORM).where(GroupORM.code == code))
    orm = result.scalar_one_or_none()
    if orm is None:
        log.warning("_load_group | group not found: %s", code)
        raise HTTPException(status_code=404, detail=f"Group {code} not found")

    c_result = await db.execute(select(ConstraintORM).where(ConstraintORM.group_code == code))
    constraints = [
        GroupConstraint(
            memberId=c.member_id, name=c.name,
            maxBudget=c.max_budget, maxDistanceMinutes=c.max_distance_minutes,
        )
        for c in c_result.scalars().all()
    ]
    log.debug("_load_group | code=%s loaded %d constraints", code, len(constraints))

    v_result = await db.execute(select(VoteORM).where(VoteORM.group_code == code))
    votes = [Vote(memberId=v.member_id, activityId=v.activity_id) for v in v_result.scalars().all()]
    log.debug("_load_group | code=%s loaded %d votes", code, len(votes))

    top_activities = rank_with_constraints(orm.prompt, [c.model_dump() for c in constraints])

    vote_counts = Counter(v.activityId for v in votes)
    winning_id: str | None = None
    if vote_counts:
        winning_id = vote_counts.most_common(1)[0][0]
        log.debug("_load_group | code=%s winning=%s (%d votes)",
                  code, winning_id, vote_counts[winning_id])

    group = Group(
        id=orm.id, code=orm.code, prompt=orm.prompt,
        constraints=constraints, topActivities=top_activities,
        votes=votes, winningActivityId=winning_id,
    )
    log.debug("_load_group | code=%s loaded OK topActivities=%d",
              code, len(group.topActivities))
    return group


@router.post("/groups", response_model=Group)
async def create_group(req: CreateGroupRequest, db: AsyncSession = Depends(get_db)):
    code = _generate_code()
    group_id = str(uuid.uuid4())
    log.info("POST /groups | creating code=%s prompt=%r", code, req.prompt)
    orm = GroupORM(code=code, id=group_id, prompt=req.prompt)
    db.add(orm)
    await db.commit()
    log.info("POST /groups | created code=%s id=%s", code, group_id)
    return await _load_group(code, db)


@router.get("/groups/{code}", response_model=Group)
async def get_group(code: str, db: AsyncSession = Depends(get_db)):
    log.info("GET /groups/%s", code)
    return await _load_group(code, db)


@router.post("/groups/{code}/constraints", response_model=Group)
async def add_constraint(code: str, constraint: GroupConstraint, db: AsyncSession = Depends(get_db)):
    log.info("POST /groups/%s/constraints | member=%s budget=%s dist=%s",
             code, constraint.memberId, constraint.maxBudget, constraint.maxDistanceMinutes)
    await _load_group(code, db)  # validates group exists

    await db.execute(
        delete(ConstraintORM).where(
            ConstraintORM.group_code == code,
            ConstraintORM.member_id == constraint.memberId,
        )
    )
    orm = ConstraintORM(
        group_code=code, member_id=constraint.memberId, name=constraint.name,
        max_budget=constraint.maxBudget, max_distance_minutes=constraint.maxDistanceMinutes,
    )
    db.add(orm)
    await db.commit()
    log.info("POST /groups/%s/constraints | upserted member=%s", code, constraint.memberId)
    return await _load_group(code, db)


@router.post("/groups/{code}/vote", response_model=Group)
async def vote(code: str, req: VoteRequest, db: AsyncSession = Depends(get_db)):
    log.info("POST /groups/%s/vote | member=%s activity=%s", code, req.memberId, req.activityId)
    await _load_group(code, db)  # validates group exists

    await db.execute(
        delete(VoteORM).where(
            VoteORM.group_code == code,
            VoteORM.member_id == req.memberId,
        )
    )
    orm = VoteORM(group_code=code, member_id=req.memberId, activity_id=req.activityId)
    db.add(orm)
    await db.commit()
    log.info("POST /groups/%s/vote | recorded member=%s → %s", code, req.memberId, req.activityId)
    return await _load_group(code, db)


@router.post("/groups/{code}/improve", response_model=ImprovedPlan)
async def improve_plan(code: str, db: AsyncSession = Depends(get_db)):
    log.info("POST /groups/%s/improve", code)
    group = await _load_group(code, db)

    if not group.winningActivityId:
        log.warning("POST /groups/%s/improve | no winning activity yet", code)
        raise HTTPException(status_code=400, detail="No winning activity yet — cast a vote first.")

    winner = next(
        (r for r in group.topActivities if r.activity.id == group.winningActivityId), None
    )
    if winner is None:
        log.error("POST /groups/%s/improve | winningActivityId=%s not in topActivities",
                  code, group.winningActivityId)
        raise HTTPException(status_code=404, detail="Winning activity not found in top results.")

    constraints_raw = [c.model_dump() for c in group.constraints]
    winner_raw = {
        "activity": winner.activity.model_dump(),
        "score": winner.score,
        "rankingReason": winner.rankingReason,
    }
    plan = generate_improved_plan(winner_raw, constraints_raw)
    log.info("POST /groups/%s/improve | plan generated for %s", code, group.winningActivityId)
    return plan
