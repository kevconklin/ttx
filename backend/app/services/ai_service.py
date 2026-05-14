"""
AI prompt construction and Claude API streaming.

This module is intentionally focused — it builds prompts and yields streamed
text chunks from the Anthropic API. Persistence of the parsed JSON results is
the responsibility of the router that calls these helpers.
"""

from __future__ import annotations

import json
import re
from typing import Any, AsyncIterator

from anthropic import AsyncAnthropic

from app.core.config import get_settings
from app.models.client import Client
from app.models.client_system import ClientSystem
from app.models.exercise import Exercise
from app.models.scenario import Scenario


settings = get_settings()
_client: AsyncAnthropic | None = None


def get_anthropic_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


# --- system prompts --------------------------------------------------------

SCENARIO_SYSTEM_PROMPT = """You are a senior cybersecurity exercise facilitator with 15+ years of experience designing tabletop exercises for Fortune 500 clients, government agencies, and critical-infrastructure operators.

Your scenarios are:
- Technically realistic and grounded in current threat actor behavior
- Tailored to the client's industry, exercise type, and (when provided) their actual systems
- Structured to challenge participants progressively over the exercise window
- Useful for assessing both technical and non-technical decision making

When the client's internal systems are provided, reference their specific hostnames, IP addresses, databases, and asset names in the injects to maximize realism. When systems are not provided, use plausible generic placeholders (e.g., "the primary domain controller", "the customer-facing web cluster").

You MUST respond with valid JSON only — no prose before or after the JSON object.

When writing technical content inside string values, avoid characters that require escaping: do not include literal backslashes, regex patterns like \\d+, or Windows paths. If you need to reference a path, file extension, or technical token, write it in prose form (e.g., "files with the dot lockd extension" rather than "*.lockd")."""

EXERCISE_PLAN_SYSTEM_PROMPT = """You are a senior cybersecurity exercise facilitator producing a professional exercise plan document.

The plan should be structured, runnable in a single session, and appropriate for the seniority of the participants. You must respond with valid JSON only — no prose before or after the JSON object."""

AAR_SYSTEM_PROMPT = """You are a senior cybersecurity exercise facilitator producing a professional After Action Report.

Your AAR is honest, balanced, and constructive. Strengths and gaps are both grounded in specific observable behaviors from the exercise. Recommendations are actionable and prioritized. Action items have clear owners and reasonable due dates.

You must respond with valid JSON only — no prose before or after the JSON object."""


# --- prompt builders -------------------------------------------------------

def _format_systems(systems: list[ClientSystem]) -> str:
    if not systems:
        return "(none provided — use plausible generic placeholders)"
    lines = []
    for s in systems:
        parts = [f"- {s.name} ({s.system_type.value}, criticality={s.criticality.value})"]
        if s.hostname:
            parts.append(f"  hostname: {s.hostname}")
        if s.ip_address:
            parts.append(f"  ip: {s.ip_address}")
        if s.description:
            parts.append(f"  description: {s.description}")
        lines.append("\n".join(parts))
    return "\n".join(lines)


def _exercise_type_guidance(exercise_type: str) -> str:
    guidance = {
        "backup_recovery": (
            "Focus on RTO/RPO discipline, backup integrity validation, "
            "restoration procedures, and post-restore data validation. "
            "Injects should pressure the team on backup freshness, the "
            "difference between application-consistent and crash-consistent "
            "backups, and cross-team coordination during restore."
        ),
        "incident_response": (
            "Walk the team through detection, containment, eradication, "
            "and recovery. Include external communications (legal, comms, "
            "regulators) and chain-of-custody decisions for forensic "
            "evidence."
        ),
        "ransomware": (
            "Combine incident response with destructive impact. Force "
            "decisions about decryption-key purchase, regulator notification, "
            "and business continuity in parallel."
        ),
        "data_breach": (
            "Emphasize discovery scope, evidence preservation, regulator "
            "notification timelines (GDPR/CCPA/sector-specific), customer "
            "notification, and downstream legal exposure."
        ),
        "business_continuity": (
            "Pressure the team on prioritization of restoration order, "
            "executive decision making under uncertainty, and customer-facing "
            "communications."
        ),
        "custom": (
            "Use the scope notes to derive realistic injects relevant to the "
            "client's specific concerns."
        ),
    }
    return guidance.get(exercise_type, guidance["custom"])


def build_scenario_prompt(
    exercise: Exercise,
    client: Client,
    client_systems: list[ClientSystem],
    count: int = 2,
    style_notes: str | None = None,
) -> str:
    return f"""Design {count} distinct tabletop exercise scenario(s) for the following engagement.

CLIENT
  Name: {client.name}
  Industry: {client.industry or "(unspecified)"}

EXERCISE
  Title: {exercise.title}
  Type: {exercise.exercise_type.value}
  Description: {exercise.description or "(none)"}
  Scope notes: {exercise.scope_notes or "(none)"}

EXERCISE TYPE GUIDANCE
{_exercise_type_guidance(exercise.exercise_type.value)}

CLIENT SYSTEMS
{_format_systems(client_systems)}

STYLE NOTES
{style_notes or "(none)"}

REQUIREMENTS for each scenario:
- A narrative setup that grounds the exercise in the client's environment
- 4-6 timed injects labeled "T+0min", "T+15min", "T+30min", etc., that escalate in severity
- For each inject: a facilitator note describing what the injectoperator should look for and how to respond to participant reactions
- 3-5 discussion questions appropriate to the scenario
- 4-6 expected participant actions (what "good" looks like)
- 3-5 common pitfalls to watch for

Respond ONLY with this JSON shape (no prose, no markdown fences):

{{
  "scenarios": [
    {{
      "title": "string",
      "description": "string",
      "inject_sequence": [
        {{ "time_offset": "T+0min", "inject": "string", "facilitator_note": "string" }}
      ],
      "discussion_questions": ["string"],
      "expected_actions": ["string"],
      "common_pitfalls": ["string"]
    }}
  ]
}}"""


def build_exercise_plan_prompt(
    exercise: Exercise,
    client: Client,
    scenarios: list[Scenario],
) -> str:
    scenario_titles = "\n".join(f"  - {s.title}" for s in scenarios) or "  (none yet)"
    return f"""Produce a complete exercise plan document for the engagement below.

CLIENT
  Name: {client.name}
  Industry: {client.industry or "(unspecified)"}

EXERCISE
  Title: {exercise.title}
  Type: {exercise.exercise_type.value}
  Scheduled: {exercise.scheduled_date or "(unscheduled)"}
  Description: {exercise.description or "(none)"}
  Scope notes: {exercise.scope_notes or "(none)"}

SCENARIOS TO RUN
{scenario_titles}

The plan should include:
- 4-6 measurable objectives
- 4-6 ground rules
- Defined facilitator/scribe/participant roles
- An agenda with timed items covering welcome, briefing, scenario blocks with breaks, hotwash, and close-out
- Materials needed (handouts, projector, etc.)
- A debrief structure with sections

Respond ONLY with this JSON shape (no prose, no markdown fences):

{{
  "objectives": ["string"],
  "ground_rules": ["string"],
  "roles": [{{ "role": "string", "responsibilities": "string" }}],
  "agenda": [{{ "time": "9:00", "duration_min": 15, "item": "string", "owner": "string" }}],
  "materials_needed": ["string"],
  "debrief_structure": {{
    "sections": ["string"],
    "duration_min": 45,
    "facilitator_prompts": ["string"]
  }}
}}"""


def build_aar_prompt(
    exercise: Exercise,
    client: Client,
    scenarios: list[Scenario],
    facilitator_notes: str | None,
    participant_feedback: str | None,
) -> str:
    scenario_block = (
        "\n".join(
            f"  - {s.title}: {s.description or '(no description)'}"
            for s in scenarios
        )
        or "  (none recorded)"
    )
    return f"""Produce a professional After Action Report for the exercise below.

CLIENT
  Name: {client.name}
  Industry: {client.industry or "(unspecified)"}

EXERCISE
  Title: {exercise.title}
  Type: {exercise.exercise_type.value}
  Description: {exercise.description or "(none)"}

SCENARIOS RUN
{scenario_block}

FACILITATOR NOTES
{facilitator_notes or "(none provided)"}

PARTICIPANT FEEDBACK
{participant_feedback or "(none provided)"}

The AAR must:
- Open with a 1-2 paragraph executive summary suitable for leadership
- List 3-6 specific strengths observed during the exercise
- List 3-6 gaps with severity ("low", "medium", "high", "critical")
- List 3-8 recommendations with priority ("low", "medium", "high")
- Produce 5-12 concrete action items, each with an owner role, priority, and a due_date relative to today (use ISO date strings, e.g. 30/60/90 days out)
- Assign an overall_rating from: excellent, satisfactory, needs_improvement, unsatisfactory

Respond ONLY with this JSON shape (no prose, no markdown fences):

{{
  "executive_summary": "string",
  "strengths": ["string"],
  "gaps_identified": [{{ "gap": "string", "severity": "low|medium|high|critical", "evidence": "string" }}],
  "recommendations": [{{ "recommendation": "string", "priority": "low|medium|high", "rationale": "string" }}],
  "action_items": [{{ "item": "string", "owner": "string", "priority": "low|medium|high", "due_date": "YYYY-MM-DD" }}],
  "overall_rating": "excellent|satisfactory|needs_improvement|unsatisfactory"
}}"""


def build_inject_prompt(
    exercise: Exercise,
    client: Client,
    scenario: Scenario,
    client_systems: list[ClientSystem],
    additional_count: int,
    style_notes: str | None = None,
) -> str:
    existing = json.dumps(scenario.inject_sequence or [], indent=2)
    return f"""Generate {additional_count} ADDITIONAL inject(s) to extend the scenario below. The new injects should pick up after the latest existing inject and continue escalating realistically.

CLIENT: {client.name} ({client.industry or "industry not provided"})
EXERCISE TYPE: {exercise.exercise_type.value}

SCENARIO
  Title: {scenario.title}
  Description: {scenario.description or "(none)"}

EXISTING INJECTS
{existing}

CLIENT SYSTEMS
{_format_systems(client_systems)}

STYLE NOTES: {style_notes or "(none)"}

Respond ONLY with this JSON shape (no prose, no markdown fences):

{{
  "additional_injects": [
    {{ "time_offset": "T+...", "inject": "string", "facilitator_note": "string" }}
  ]
}}"""


# --- streaming + parsing helpers -------------------------------------------

async def stream_completion(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    """Yield text deltas from the Anthropic streaming API."""
    client = get_anthropic_client()
    async with client.messages.stream(
        model=settings.anthropic_model,
        max_tokens=max_tokens or settings.anthropic_max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    ) as stream:
        async for text_delta in stream.text_stream:
            yield text_delta


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)

# Matches a backslash that is NOT followed by a valid JSON escape character.
# Valid escapes after `\` are: " \ / b f n r t u
_INVALID_ESCAPE_RE = re.compile(r'\\(?!["\\/bfnrtu])')


def _sanitize_lone_backslashes(s: str) -> str:
    """Escape any backslashes that aren't already part of a valid JSON escape.

    Models occasionally emit content like `\\x00`, `\\d+`, or Windows paths
    inside JSON strings without escaping them. Doubling those backslashes
    lets `json.loads` parse the output without altering valid escapes like
    `\\n`, `\\t`, or `\\"`.
    """
    return _INVALID_ESCAPE_RE.sub(r"\\\\", s)


def parse_json_strict(text: str) -> dict[str, Any]:
    """Parse a Claude response that should be JSON.

    Strips optional markdown fences. Tries a strict parse first, then a
    lenient retry that sanitizes lone backslashes. Raises ValueError if no
    parseable JSON is found.
    """
    candidate = text.strip()

    fence_match = _JSON_FENCE_RE.search(candidate)
    if fence_match:
        candidate = fence_match.group(1).strip()

    if not candidate.startswith("{"):
        # Find the first `{` and last `}` to trim any leading/trailing prose.
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in model output")
        candidate = candidate[start : end + 1]

    # Pass 1: strict (allow control chars via strict=False so literal newlines
    # inside string values don't fail).
    try:
        return json.loads(candidate, strict=False)
    except json.JSONDecodeError as first_err:
        # Pass 2: try again after escaping any lone backslashes.
        try:
            sanitized = _sanitize_lone_backslashes(candidate)
            return json.loads(sanitized, strict=False)
        except json.JSONDecodeError:
            pass

        truncated_hint = ""
        msg_lower = str(first_err).lower()
        if "unterminated" in msg_lower or "expecting value" in msg_lower:
            truncated_hint = (
                " — output may have hit the max_tokens limit. "
                "Increase ANTHROPIC_MAX_TOKENS in the backend env or "
                "request fewer items per generation."
            )
        raise ValueError(
            f"Model output is not valid JSON: {first_err}{truncated_hint}"
        ) from first_err
