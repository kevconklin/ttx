# Cybersecurity Tabletop Exercise Generator

A consultant-facing tool for scoping, generating, delivering, and reporting on
cybersecurity tabletop exercises. The flow is:

1. **Scope** the engagement — client, exercise type, optional inventory of internal systems.
2. **Generate** tailored scenarios and an exercise plan via Claude (streamed live).
3. **Send for review** to the client and capture their feedback.
4. **Conduct** the exercise.
5. **Generate an After Action Report** and export it as a polished PDF.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2 (async), Alembic |
| Database | PostgreSQL 16 |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`), streamed via SSE |
| PDF | WeasyPrint + Jinja2 |
| Container | Docker + Docker Compose |

> **Model:** the AI service uses `claude-sonnet-4-20250514` per the project spec.
> If you want the latest Sonnet, set `anthropic_model` in `app/core/config.py`
> (or `ANTHROPIC_MODEL` env var) to `claude-sonnet-4-6`. No other changes needed.

---

## Quick start

```bash
# 1. Copy environment templates
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local

# 2. Set your Anthropic key in .env
#    ANTHROPIC_API_KEY=sk-ant-...

# 3. Build + run everything (Postgres + backend + frontend)
docker compose up --build

# 4. (In another shell) Seed the database for an instant demo
docker compose exec backend python seed.py
```

Open:

- Frontend: <http://localhost:3000>
- Backend OpenAPI: <http://localhost:8000/docs>
- Health: <http://localhost:8000/health>

### Development mode (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The dev overlay mounts `./backend` and `./frontend` into their containers and
runs `uvicorn --reload` and `next dev` respectively.

### Running migrations manually

Migrations run automatically on backend container start (`scripts/start.sh`).
To run them yourself:

```bash
docker compose exec backend alembic upgrade head
```

To create a new migration after changing models:

```bash
docker compose exec backend alembic revision -m "describe change" --autogenerate
```

---

## Architecture notes

### Streaming generation

All AI generation endpoints stream output via Server-Sent Events so the UI can
show progress in real time. The envelope is uniform:

```
data: {"type": "delta", "content": "...chunk of text..."}
data: {"type": "done",  "result":  {...}}
data: {"type": "error", "message": "..."}
```

- Backend: see `backend/app/routers/generate.py` and `services/ai_service.py`.
- Frontend: `frontend/lib/stream.ts` (raw SSE reader) + `lib/hooks.ts`
  (`useStreamGeneration<T>()` hook with `idle | streaming | done | error` state).

### Auth

`backend/app/core/auth.py` exposes a single dependency, `get_current_user`,
which currently returns a hardcoded mock user. All API routers depend on this
already, so swapping in real auth is a one-file change:

1. Add `fastapi-users` (or your preferred JWT lib) to `requirements.txt`.
2. Implement the token decode + user lookup inside `get_current_user`.
3. Add a real `users` table + Alembic migration.

No router signatures change — every endpoint already requires the dependency.

### PDF export

`backend/app/services/pdf_service.py` renders a Jinja2 template via WeasyPrint.
The Dockerfile installs the Pango/Cairo system deps WeasyPrint needs. The
template lives inline in the service for now — extract it to a `templates/`
directory if you need branded variants per client.

---

## Adding a new exercise type

The exercise type is an enum on the `Exercise` model. To add `cloud_outage`:

1. **Model + migration:**
   - Add `cloud_outage = "cloud_outage"` to `ExerciseType` in
     `backend/app/models/exercise.py`.
   - Create a new Alembic migration that ALTERs the `exercise_type` enum:
     ```python
     op.execute("ALTER TYPE exercise_type ADD VALUE 'cloud_outage'")
     ```
2. **AI guidance:** add a clause to `_exercise_type_guidance()` in
   `backend/app/services/ai_service.py` describing what scenarios for this type
   should focus on. This is what most affects scenario quality.
3. **Frontend:** add the new option to `EXERCISE_TYPES` in
   `frontend/app/exercises/new/page.tsx` and add a TypeScript union member in
   `frontend/types/index.ts`.

---

## Project layout

```
.
├── backend/
│   ├── app/
│   │   ├── core/           # config, db engine, auth stub, error handlers
│   │   ├── models/         # SQLAlchemy ORM (clients, systems, exercises, scenarios, plans, AARs)
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── routers/        # FastAPI routers — clients, exercises, scenarios, generate, aar
│   │   ├── services/       # ai_service (prompts + streaming), pdf_service (WeasyPrint)
│   │   └── main.py
│   ├── alembic/            # migrations (0001_initial seeds all tables + enums)
│   ├── seed.py             # demo data: 1 client, 5 systems, 1 exercise w/ 2 scenarios + plan
│   ├── scripts/start.sh    # `alembic upgrade head` then uvicorn
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # dashboard
│   │   ├── layout.tsx
│   │   ├── clients/page.tsx
│   │   ├── exercises/page.tsx     # list
│   │   ├── exercises/new/page.tsx # 4-step wizard
│   │   └── exercises/[id]/
│   │       ├── page.tsx
│   │       └── _tabs/
│   │           ├── OverviewTab.tsx
│   │           ├── ScenariosTab.tsx
│   │           ├── PlanTab.tsx
│   │           └── AARTab.tsx
│   ├── components/                # Navigation, Toast, StatusBadge, StreamingPreview
│   ├── lib/
│   │   ├── api.ts                 # thin wrapper around the FastAPI routes
│   │   ├── stream.ts              # SSE fetch reader
│   │   └── hooks.ts               # useStreamGeneration
│   └── types/index.ts
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

---

## Known limitations / next steps

- **Auth is a stub.** Wire in `fastapi-users` or your IdP before production.
- **No background jobs.** All AI work happens within the request lifecycle via
  SSE. If you need to support disconnect/reconnect, persist a generation job
  row and stream from it.
- **PDF template branding** is controlled by `company_name` in settings (and
  the inline logo placeholder in the PDF template). Update both for your firm.
- **No tests yet.** Add pytest for the backend (especially `parse_json_strict`
  edge cases and the streaming routes' DB writes) and Playwright for the
  wizard + tab flows.
