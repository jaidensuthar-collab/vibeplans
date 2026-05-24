from fastapi import APIRouter
from ..activities import ACTIVITIES
from ..schemas import Activity
from ..logger import get_logger

log = get_logger("vibeplan.routes.activities")
router = APIRouter(tags=["activities"])


@router.get("/activities", response_model=list[Activity])
async def get_activities():
    log.info("get_activities | returning %d activities", len(ACTIVITIES))
    return [Activity(**a) for a in ACTIVITIES]
