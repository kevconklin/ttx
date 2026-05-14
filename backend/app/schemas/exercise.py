from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.exercise import ExerciseStatus, ExerciseType


class ExerciseBase(BaseModel):
    title: str
    description: str | None = None
    exercise_type: ExerciseType
    scope_notes: str | None = None
    has_client_systems: bool = False
    scheduled_date: date | None = None
    completed_date: date | None = None


class ExerciseCreate(ExerciseBase):
    client_id: UUID


class ExerciseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    exercise_type: ExerciseType | None = None
    scope_notes: str | None = None
    has_client_systems: bool | None = None
    scheduled_date: date | None = None
    completed_date: date | None = None
    status: ExerciseStatus | None = None


class ExerciseStatusUpdate(BaseModel):
    status: ExerciseStatus


class ExerciseRead(ExerciseBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    client_id: UUID
    status: ExerciseStatus
    created_at: datetime
    updated_at: datetime
