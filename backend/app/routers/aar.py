from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.aar import AfterActionReport
from app.models.client import Client
from app.models.exercise import Exercise
from app.schemas.aar import AARRead, AARUpdate
from app.services.pdf_service import render_aar_pdf


router = APIRouter()


async def _get_or_create_aar(
    db: AsyncSession, exercise_id: UUID
) -> AfterActionReport:
    result = await db.execute(
        select(AfterActionReport).where(AfterActionReport.exercise_id == exercise_id)
    )
    aar = result.scalar_one_or_none()
    if aar is None:
        exercise = await db.get(Exercise, exercise_id)
        if exercise is None:
            raise HTTPException(status_code=404, detail="Exercise not found")
        aar = AfterActionReport(exercise_id=exercise_id)
        db.add(aar)
        await db.commit()
        await db.refresh(aar)
    return aar


@router.get("/exercises/{exercise_id}/aar", response_model=AARRead)
async def get_aar(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> AfterActionReport:
    return await _get_or_create_aar(db, exercise_id)


@router.put("/exercises/{exercise_id}/aar", response_model=AARRead)
async def update_aar(
    exercise_id: UUID,
    payload: AARUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> AfterActionReport:
    aar = await _get_or_create_aar(db, exercise_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(aar, field, value)
    await db.commit()
    await db.refresh(aar)
    return aar


@router.get("/exercises/{exercise_id}/aar/export")
async def export_aar_pdf(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Response:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    client = await db.get(Client, exercise.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    aar = await _get_or_create_aar(db, exercise_id)

    pdf_bytes = render_aar_pdf(exercise=exercise, client=client, aar=aar)
    filename = f"AAR_{client.name.replace(' ', '_')}_{exercise.title.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
