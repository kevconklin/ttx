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


class OverallRating(str, enum.Enum):
    excellent = "excellent"
    satisfactory = "satisfactory"
    needs_improvement = "needs_improvement"
    unsatisfactory = "unsatisfactory"


class AfterActionReport(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "after_action_reports"

    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exercises.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    strengths: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    gaps_identified: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    recommendations: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    action_items: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    overall_rating: Mapped[OverallRating | None] = mapped_column(
        SqlEnum(OverallRating, name="overall_rating"), nullable=True
    )
    raw_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    facilitator_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    participant_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    exercise: Mapped["Exercise"] = relationship(back_populates="aar")
