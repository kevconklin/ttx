from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.client import Client
from app.models.exercise import Exercise, ExerciseStatus
from app.models.exercise_plan import ExercisePlan
from app.schemas.exercise import (
    ExerciseCreate,
    ExerciseRead,
    ExerciseStatusUpdate,
    ExerciseUpdate,
)
from app.schemas.exercise_plan import ExercisePlanRead, ExercisePlanUpdate


router = APIRouter()


@router.get("/exercises", response_model=list[ExerciseRead])
async def list_exercises(
    status_filter: ExerciseStatus | None = Query(default=None, alias="status"),
    client_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> list[Exercise]:
    stmt = select(Exercise).order_by(Exercise.created_at.desc())
    if status_filter is not None:
        stmt = stmt.where(Exercise.status == status_filter)
    if client_id is not None:
        stmt = stmt.where(Exercise.client_id == client_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/exercises", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    payload: ExerciseCreate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Exercise:
    client = await db.get(Client, payload.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    exercise = Exercise(**payload.model_dump())
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


async def _get_exercise_or_404(db: AsyncSession, exercise_id: UUID) -> Exercise:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


@router.get("/exercises/{exercise_id}", response_model=ExerciseRead)
async def get_exercise(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Exercise:
    return await _get_exercise_or_404(db, exercise_id)


@router.put("/exercises/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: UUID,
    payload: ExerciseUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Exercise:
    exercise = await _get_exercise_or_404(db, exercise_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.patch("/exercises/{exercise_id}/status", response_model=ExerciseRead)
async def update_exercise_status(
    exercise_id: UUID,
    payload: ExerciseStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Exercise:
    exercise = await _get_exercise_or_404(db, exercise_id)
    exercise.status = payload.status
    await db.commit()
    await db.refresh(exercise)
    return exercise


# --- exercise plan ---------------------------------------------------------

@router.get("/exercises/{exercise_id}/plan", response_model=ExercisePlanRead)
async def get_exercise_plan(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> ExercisePlan:
    result = await db.execute(
        select(ExercisePlan).where(ExercisePlan.exercise_id == exercise_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Exercise plan not found")
    return plan


@router.put("/exercises/{exercise_id}/plan", response_model=ExercisePlanRead)
async def update_exercise_plan(
    exercise_id: UUID,
    payload: ExercisePlanUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> ExercisePlan:
    await _get_exercise_or_404(db, exercise_id)
    result = await db.execute(
        select(ExercisePlan).where(ExercisePlan.exercise_id == exercise_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        plan = ExercisePlan(exercise_id=exercise_id)
        db.add(plan)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    await db.commit()
    await db.refresh(plan)
    return plan
