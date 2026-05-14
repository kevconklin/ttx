from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.client_system import Criticality, SystemType


class ClientBase(BaseModel):
    name: str
    industry: str | None = None
    contact_email: EmailStr | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    contact_email: EmailStr | None = None


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime


class ClientSystemBase(BaseModel):
    system_type: SystemType
    name: str
    ip_address: str | None = None
    hostname: str | None = None
    description: str | None = None
    criticality: Criticality = Criticality.medium


class ClientSystemCreate(ClientSystemBase):
    pass


class ClientSystemUpdate(BaseModel):
    system_type: SystemType | None = None
    name: str | None = None
    ip_address: str | None = None
    hostname: str | None = None
    description: str | None = None
    criticality: Criticality | None = None


class ClientSystemRead(ClientSystemBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    client_id: UUID
    created_at: datetime
    updated_at: datetime
