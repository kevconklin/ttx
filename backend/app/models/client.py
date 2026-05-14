from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UuidPkMixin

if TYPE_CHECKING:
    from app.models.client_system import ClientSystem
    from app.models.exercise import Exercise


class Client(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "clients"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(320), nullable=True)

    systems: Mapped[list["ClientSystem"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
