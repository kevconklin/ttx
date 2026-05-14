import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UuidPkMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise


class ScenarioStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    rejected = "rejected"


class Scenario(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "scenarios"

    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exercises.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    inject_sequence: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    discussion_questions: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    expected_actions: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    common_pitfalls: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[ScenarioStatus] = mapped_column(
        SqlEnum(ScenarioStatus, name="scenario_status"),
        nullable=False,
        default=ScenarioStatus.draft,
    )
    client_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    exercise: Mapped["Exercise"] = relationship(back_populates="scenarios")
