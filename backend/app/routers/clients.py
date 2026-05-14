from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.client import Client
from app.models.client_system import ClientSystem
from app.schemas.client import (
    ClientCreate,
    ClientRead,
    ClientSystemCreate,
    ClientSystemRead,
    ClientSystemUpdate,
    ClientUpdate,
)


router = APIRouter()


# --- clients ---------------------------------------------------------------

@router.get("/clients", response_model=list[ClientRead])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> list[Client]:
    result = await db.execute(select(Client).order_by(Client.created_at.desc()))
    return list(result.scalars().all())


@router.post("/clients", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def _get_client_or_404(db: AsyncSession, client_id: UUID) -> Client:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.get("/clients/{client_id}", response_model=ClientRead)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Client:
    return await _get_client_or_404(db, client_id)


@router.put("/clients/{client_id}", response_model=ClientRead)
async def update_client(
    client_id: UUID,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> Client:
    client = await _get_client_or_404(db, client_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> None:
    client = await _get_client_or_404(db, client_id)
    await db.delete(client)
    await db.commit()


# --- client systems --------------------------------------------------------

@router.get("/clients/{client_id}/systems", response_model=list[ClientSystemRead])
async def list_client_systems(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> list[ClientSystem]:
    await _get_client_or_404(db, client_id)
    result = await db.execute(
        select(ClientSystem)
        .where(ClientSystem.client_id == client_id)
        .order_by(ClientSystem.created_at)
    )
    return list(result.scalars().all())


@router.post(
    "/clients/{client_id}/systems",
    response_model=ClientSystemRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_client_system(
    client_id: UUID,
    payload: ClientSystemCreate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> ClientSystem:
    await _get_client_or_404(db, client_id)
    system = ClientSystem(client_id=client_id, **payload.model_dump())
    db.add(system)
    await db.commit()
    await db.refresh(system)
    return system


async def _get_system_or_404(
    db: AsyncSession, client_id: UUID, system_id: UUID
) -> ClientSystem:
    system = await db.get(ClientSystem, system_id)
    if system is None or system.client_id != client_id:
        raise HTTPException(status_code=404, detail="Client system not found")
    return system


@router.put(
    "/clients/{client_id}/systems/{system_id}",
    response_model=ClientSystemRead,
)
async def update_client_system(
    client_id: UUID,
    system_id: UUID,
    payload: ClientSystemUpdate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> ClientSystem:
    system = await _get_system_or_404(db, client_id, system_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(system, field, value)
    await db.commit()
    await db.refresh(system)
    return system


@router.delete(
    "/clients/{client_id}/systems/{system_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_client_system(
    client_id: UUID,
    system_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> None:
    system = await _get_system_or_404(db, client_id, system_id)
    await db.delete(system)
    await db.commit()
