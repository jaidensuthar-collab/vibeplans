from fastapi import APIRouter
from ..schemas import RankedActivity, RankRequest
from ..mock_planner import parse_prompt, rank_activities
from ..logger import get_logger

log = get_logger("vibeplan.routes.rank")
router = APIRouter(tags=["rank"])


@router.post("/rank", response_model=list[RankedActivity])
async def rank(req: RankRequest):
    log.info("POST /rank | prompt=%r", req.prompt)
    prompt = parse_prompt(req.prompt)
    results = rank_activities(prompt)
    log.info("POST /rank | returning %d results", len(results))
    return results
