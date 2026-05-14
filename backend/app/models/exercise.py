import enum
import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UuidPkMixin

if TYPE_CHECKING:
    from app.models.aar import AfterActionReport
    from app.models.client import Client
    from app.models.exercise_plan import ExercisePlan
    from app.models.scenario import Scenario


class ExerciseType(str, enum.Enum):
    backup_recovery = "backup_recovery"
    incident_response = "incident_response"
    ransomware = "ransomware"
    data_breach = "data_breach"
    business_continuity = "business_continuity"
    custom = "custom"


class ExerciseStatus(str, enum.Enum):
    scoping = "scoping"
    scenarios_generated = "scenarios_generated"
    sent_for_review = "sent_for_review"
    in_progress = "in_progress"
    completed = "completed"


class Exercise(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "exercises"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    exercise_type: Mapped[ExerciseType] = mapped_column(
        SqlEnum(ExerciseType, name="exercise_type"), nullable=False
    )
    status: Mapped[ExerciseStatus] = mapped_column(
        SqlEnum(ExerciseStatus, name="exercise_status"),
        nullable=False,
        default=ExerciseStatus.scoping,
    )
    scope_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    has_client_systems: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    scheduled_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    client: Mapped["Client"] = relationship(back_populates="exercises")
    scenarios: Mapped[list["Scenario"]] = relationship(
        back_populates="exercise", cascade="all, delete-orphan"
    )
    plan: Mapped["ExercisePlan | None"] = relationship(
        back_populates="exercise",
        cascade="all, delete-orphan",
        uselist=False,
    )
    aar: Mapped["AfterActionReport | None"] = relationship(
        back_populates="exercise",
        cascade="all, delete-orphan",
        uselist=False,
    )
