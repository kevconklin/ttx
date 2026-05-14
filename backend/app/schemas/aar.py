from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.aar import OverallRating


class AARBase(BaseModel):
    executive_summary: str | None = None
    strengths: list[str] | None = None
    gaps_identified: list[dict[str, Any]] | None = None
    recommendations: list[dict[str, Any]] | None = None
    action_items: list[dict[str, Any]] | None = None
    overall_rating: OverallRating | None = None
    raw_notes: str | None = None
    facilitator_notes: str | None = None
    participant_feedback: str | None = None


class AARUpdate(AARBase):
    pass


class AARRead(AARBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    exercise_id: UUID
    created_at: datetime
    updated_at: datetime
