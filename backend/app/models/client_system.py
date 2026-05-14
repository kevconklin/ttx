import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UuidPkMixin

if TYPE_CHECKING:
    from app.models.client import Client


class SystemType(str, enum.Enum):
    server = "server"
    database = "database"
    network_device = "network_device"
    endpoint = "endpoint"
    cloud = "cloud"
    other = "other"


class Criticality(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class ClientSystem(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "client_systems"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    system_type: Mapped[SystemType] = mapped_column(
        SqlEnum(SystemType, name="system_type"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    criticality: Mapped[Criticality] = mapped_column(
        SqlEnum(Criticality, name="criticality"),
        nullable=False,
        default=Criticality.medium,
    )

    client: Mapped["Client"] = relationship(back_populates="systems")
