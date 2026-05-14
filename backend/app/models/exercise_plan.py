import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum as SqlEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UuidPkMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise


class ExercisePlanStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    approved = "approved"


class ExercisePlan(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "exercise_plans"

    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exercises.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    agenda: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    objectives: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    participants: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    ground_rules: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    roles: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    materials_needed: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    debrief_structure: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    logistics_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ExercisePlanStatus] = mapped_column(
        SqlEnum(ExercisePlanStatus, name="exercise_plan_status"),
        nullable=False,
        default=ExercisePlanStatus.draft,
    )

    exercise: Mapped["Exercise"] = relationship(back_populates="plan")
