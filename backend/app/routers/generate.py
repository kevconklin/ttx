"""
AI generation endpoints — all return Server-Sent Events.

Envelope format:
  data: {"type": "delta", "content": "..."}
  data: {"type": "done", "result": {...}}
  data: {"type": "error", "message": "..."}
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import CurrentUser, get_current_user
from app.core.database import SessionLocal, get_db
from app.models.client import Client
from app.models.client_system import ClientSystem
from app.models.exercise import Exercise, ExerciseStatus
from app.models.exercise_plan import ExercisePlan
from app.models.aar import AfterActionReport, OverallRating
from app.models.scenario import Scenario
from app.schemas.generate import (
    GenerateAARRequest,
    GenerateExercisePlanRequest,
    GenerateInjectsRequest,
    GenerateScenariosRequest,
)
from app.services.ai_service import (
    AAR_SYSTEM_PROMPT,
    EXERCISE_PLAN_SYSTEM_PROMPT,
    SCENARIO_SYSTEM_PROMPT,
    build_aar_prompt,
    build_exercise_plan_prompt,
    build_inject_prompt,
    build_scenario_prompt,
    parse_json_strict,
    stream_completion,
)


router = APIRouter()


SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


def _sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


# --- scenarios -------------------------------------------------------------

@router.post("/generate/scenarios/stream")
async def stream_scenarios(
    request: GenerateScenariosRequest,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    exercise = await db.get(Exercise, request.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    client = await db.get(Client, exercise.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    systems_result = await db.execute(
        select(ClientSystem).where(ClientSystem.client_id == client.id)
    )
    systems = list(systems_result.scalars().all())

    user_prompt = build_scenario_prompt(
        exercise=exercise,
        client=client,
        client_systems=systems,
        count=request.count,
        style_notes=request.style_notes,
    )

    async def event_generator() -> AsyncIterator[str]:
        full_text = ""
        try:
            async for delta in stream_completion(SCENARIO_SYSTEM_PROMPT, user_prompt):
                full_text += delta
                yield _sse({"type": "delta", "content": delta})

            parsed = parse_json_strict(full_text)
            saved = await _save_scenarios(exercise.id, parsed)
            yield _sse({"type": "done", "result": saved})
        except Exception as exc:  # noqa: BLE001
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


async def _save_scenarios(exercise_id: UUID, parsed: dict[str, Any]) -> dict[str, Any]:
    items = parsed.get("scenarios", [])
    saved_ids: list[str] = []
    async with SessionLocal() as session:
        for item in items:
            scenario = Scenario(
                exercise_id=exercise_id,
                title=item.get("title", "Untitled scenario"),
                description=item.get("description"),
                inject_sequence=item.get("inject_sequence"),
                discussion_questions=item.get("discussion_questions"),
                expected_actions=item.get("expected_actions"),
                common_pitfalls=item.get("common_pitfalls"),
            )
            session.add(scenario)
            await session.flush()
            saved_ids.append(str(scenario.id))

        exercise = await session.get(Exercise, exercise_id)
        if exercise is not None and exercise.status == ExerciseStatus.scoping:
            exercise.status = ExerciseStatus.scenarios_generated

        await session.commit()
    return {"scenario_ids": saved_ids, "count": len(saved_ids)}


# --- exercise plan ---------------------------------------------------------

@router.post("/generate/exercise-plan/stream")
async def stream_exercise_plan(
    request: GenerateExercisePlanRequest,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Exercise)
        .where(Exercise.id == request.exercise_id)
        .options(selectinload(Exercise.scenarios))
    )
    exercise = result.scalar_one_or_none()
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    client = await db.get(Client, exercise.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    user_prompt = build_exercise_plan_prompt(
        exercise=exercise,
        client=client,
        scenarios=exercise.scenarios,
    )

    async def event_generator() -> AsyncIterator[str]:
        full_text = ""
        try:
            async for delta in stream_completion(EXERCISE_PLAN_SYSTEM_PROMPT, user_prompt):
                full_text += delta
                yield _sse({"type": "delta", "content": delta})

            parsed = parse_json_strict(full_text)
            saved = await _save_exercise_plan(exercise.id, parsed)
            yield _sse({"type": "done", "result": saved})
        except Exception as exc:  # noqa: BLE001
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


async def _save_exercise_plan(exercise_id: UUID, parsed: dict[str, Any]) -> dict[str, Any]:
    async with SessionLocal() as session:
        result = await session.execute(
            select(ExercisePlan).where(ExercisePlan.exercise_id == exercise_id)
        )
        plan = result.scalar_one_or_none()
        if plan is None:
            plan = ExercisePlan(exercise_id=exercise_id)
            session.add(plan)
        plan.objectives = parsed.get("objectives")
        plan.ground_rules = parsed.get("ground_rules")
        plan.roles = parsed.get("roles")
        plan.agenda = parsed.get("agenda")
        plan.materials_needed = parsed.get("materials_needed")
        plan.debrief_structure = parsed.get("debrief_structure")
        await session.commit()
        await session.refresh(plan)
        return {"exercise_plan_id": str(plan.id)}


# --- AAR -------------------------------------------------------------------

@router.post("/generate/aar/stream")
async def stream_aar(
    request: GenerateAARRequest,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Exercise)
        .where(Exercise.id == request.exercise_id)
        .options(selectinload(Exercise.scenarios))
    )
    exercise = result.scalar_one_or_none()
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    client = await db.get(Client, exercise.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    user_prompt = build_aar_prompt(
        exercise=exercise,
        client=client,
        scenarios=exercise.scenarios,
        facilitator_notes=request.facilitator_notes,
        participant_feedback=request.participant_feedback,
    )

    async def event_generator() -> AsyncIterator[str]:
        full_text = ""
        try:
            async for delta in stream_completion(AAR_SYSTEM_PROMPT, user_prompt):
                full_text += delta
                yield _sse({"type": "delta", "content": delta})

            parsed = parse_json_strict(full_text)
            saved = await _save_aar(
                exercise.id,
                parsed,
                facilitator_notes=request.facilitator_notes,
                participant_feedback=request.participant_feedback,
            )
            yield _sse({"type": "done", "result": saved})
        except Exception as exc:  # noqa: BLE001
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


async def _save_aar(
    exercise_id: UUID,
    parsed: dict[str, Any],
    facilitator_notes: str | None,
    participant_feedback: str | None,
) -> dict[str, Any]:
    async with SessionLocal() as session:
        result = await session.execute(
            select(AfterActionReport).where(AfterActionReport.exercise_id == exercise_id)
        )
        aar = result.scalar_one_or_none()
        if aar is None:
            aar = AfterActionReport(exercise_id=exercise_id)
            session.add(aar)
        aar.executive_summary = parsed.get("executive_summary")
        aar.strengths = parsed.get("strengths")
        aar.gaps_identified = parsed.get("gaps_identified")
        aar.recommendations = parsed.get("recommendations")
        aar.action_items = parsed.get("action_items")
        rating_value = parsed.get("overall_rating")
        try:
            aar.overall_rating = OverallRating(rating_value) if rating_value else None
        except ValueError:
            aar.overall_rating = None
        aar.facilitator_notes = facilitator_notes
        aar.participant_feedback = participant_feedback
        await session.commit()
        await session.refresh(aar)
        return {"aar_id": str(aar.id)}


# --- additional injects ----------------------------------------------------

@router.post("/generate/scenario-injects/{scenario_id}/stream")
async def stream_scenario_injects(
    scenario_id: UUID,
    request: GenerateInjectsRequest,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    scenario = await db.get(Scenario, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    exercise = await db.get(Exercise, scenario.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    client = await db.get(Client, exercise.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    systems_result = await db.execute(
        select(ClientSystem).where(ClientSystem.client_id == client.id)
    )
    systems = list(systems_result.scalars().all())

    user_prompt = build_inject_prompt(
        exercise=exercise,
        client=client,
        scenario=scenario,
        client_systems=systems,
        additional_count=request.additional_count,
        style_notes=request.style_notes,
    )

    async def event_generator() -> AsyncIterator[str]:
        full_text = ""
        try:
            async for delta in stream_completion(SCENARIO_SYSTEM_PROMPT, user_prompt):
                full_text += delta
                yield _sse({"type": "delta", "content": delta})

            parsed = parse_json_strict(full_text)
            saved = await _append_injects(scenario_id, parsed)
            yield _sse({"type": "done", "result": saved})
        except Exception as exc:  # noqa: BLE001
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


async def _append_injects(scenario_id: UUID, parsed: dict[str, Any]) -> dict[str, Any]:
    additional = parsed.get("additional_injects", [])
    async with SessionLocal() as session:
        scenario = await session.get(Scenario, scenario_id)
        if scenario is None:
            return {"appended": 0}
        existing = list(scenario.inject_sequence or [])
        existing.extend(additional)
        scenario.inject_sequence = existing
        await session.commit()
        await session.refresh(scenario)
    return {"scenario_id": str(scenario_id), "appended": len(additional)}
