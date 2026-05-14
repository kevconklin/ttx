from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.scenario import Scenario
from app.schemas.scenario import ScenarioRead, ScenarioStatusUpdate, ScenarioUpdate


router = APIRouter()


@router.get("/exercises/{exercise_id}/scenarios", response_model=list[ScenarioRead])
async def list_scenarios(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> list[Scenario]:
    result = await db.execute(
        select(Scenario)
        .where(Scenario.exercise_id == exercise_id)
        .order_by(Scenario.created_at)
    )
    return list(result.scalars().all())


async def _get_scenario_or_404(db: AsyncSession, scenario_id: UUID) -> Scenario:
    scenario = await db.get(Scenario, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.put("/scenarios/{scenario_id}", response_model=ScenarioRead)
async def update_scenario(
    scenario_id: UUID,
    payload: ScenarioUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Scenario:
    scenario = await _get_scenario_or_404(db, scenario_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(scenario, field, value)
    await db.commit()
    await db.refresh(scenario)
    return scenario


@router.patch("/scenarios/{scenario_id}/status", response_model=ScenarioRead)
async def update_scenario_status(
    scenario_id: UUID,
    payload: ScenarioStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Scenario:
    scenario = await _get_scenario_or_404(db, scenario_id)
    scenario.status = payload.status
    if payload.client_notes is not None:
        scenario.client_notes = payload.client_notes
    await db.commit()
    await db.refresh(scenario)
    return scenario
