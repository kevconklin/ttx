from uuid import UUID

from pydantic import BaseModel, Field


class GenerateScenariosRequest(BaseModel):
    exercise_id: UUID
    count: int = Field(default=2, ge=1, le=5)
    style_notes: str | None = None


class GenerateExercisePlanRequest(BaseModel):
    exercise_id: UUID
    style_notes: str | None = None


class GenerateAARRequest(BaseModel):
    exercise_id: UUID
    facilitator_notes: str | None = None
    participant_feedback: str | None = None


class GenerateInjectsRequest(BaseModel):
    additional_count: int = Field(default=2, ge=1, le=5)
    style_notes: str | None = None
