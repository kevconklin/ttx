"""
Auth stub.

This module is intentionally a placeholder. `get_current_user` currently returns
a hardcoded mock user so all protected routes work end-to-end during development.

To swap in real auth later:
  1. Add fastapi-users (or your JWT lib of choice) to requirements.txt.
  2. Implement a real authentication backend that decodes a JWT from the
     Authorization header and resolves the user from the database.
  3. Replace the body of `get_current_user` with that resolution logic.
     The dependency signature stays the same, so no router changes are required.
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str
    name: str
    is_active: bool = True


MOCK_USER = CurrentUser(
    id=UUID("00000000-0000-0000-0000-000000000001"),
    email="consultant@example.com",
    name="Mock Consultant",
)


async def get_current_user() -> CurrentUser:
    return MOCK_USER
