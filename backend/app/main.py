from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.routers import aar, clients, exercises, generate, scenarios


settings = get_settings()

app = FastAPI(
    title="Cybersecurity Tabletop Exercise Generator",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(clients.router, prefix=settings.api_v1_prefix, tags=["clients"])
app.include_router(exercises.router, prefix=settings.api_v1_prefix, tags=["exercises"])
app.include_router(scenarios.router, prefix=settings.api_v1_prefix, tags=["scenarios"])
app.include_router(generate.router, prefix=settings.api_v1_prefix, tags=["generate"])
app.include_router(aar.router, prefix=settings.api_v1_prefix, tags=["aar"])
