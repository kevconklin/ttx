from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.scenario import ScenarioStatus


class ScenarioBase(BaseModel):
    title: str
    description: str | None = None
    inject_sequence: list[dict[str, Any]] | None = None
    discussion_questions: list[str] | None = None
    expected_actions: list[str] | None = None
    common_pitfalls: list[str] | None = None
    client_notes: str | None = None


class ScenarioUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    inject_sequence: list[dict[str, Any]] | None = None
    discussion_questions: list[str] | None = None
    expected_actions: list[str] | None = None
    common_pitfalls: list[str] | None = None
    client_notes: str | None = None
    status: ScenarioStatus | None = None


class ScenarioStatusUpdate(BaseModel):
    status: ScenarioStatus
    client_notes: str | None = None


class ScenarioRead(ScenarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    exercise_id: UUID
    status: ScenarioStatus
    created_at: datetime
    updated_at: datetime
