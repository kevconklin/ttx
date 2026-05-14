from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.exercise_plan import ExercisePlanStatus


class ExercisePlanBase(BaseModel):
    agenda: list[dict[str, Any]] | None = None
    objectives: list[str] | None = None
    participants: list[dict[str, Any]] | None = None
    ground_rules: list[str] | None = None
    roles: list[dict[str, Any]] | None = None
    materials_needed: list[str] | None = None
    debrief_structure: dict[str, Any] | None = None
    logistics_notes: str | None = None


class ExercisePlanUpdate(ExercisePlanBase):
    status: ExercisePlanStatus | None = None


class ExercisePlanRead(ExercisePlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    exercise_id: UUID
    status: ExercisePlanStatus
    created_at: datetime
    updated_at: datetime
