"""
Seed the database with one example client, a few systems, and one exercise
with pre-baked scenarios. Lets you demo the app end-to-end without ever
calling the Claude API.

Usage (inside the backend container):
    python seed.py
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import (
    Client,
    ClientSystem,
    Criticality,
    Exercise,
    ExercisePlan,
    ExercisePlanStatus,
    ExerciseStatus,
    ExerciseType,
    Scenario,
    ScenarioStatus,
    SystemType,
)


CLIENT_NAME = "Northwind Health Systems"


SCENARIO_RANSOMWARE = {
    "title": "Ransomware encrypts the EHR cluster",
    "description": (
        "At 04:12 AM, monitoring detects rapid encryption activity originating "
        "from the EHR database servers (db-ehr-01/02). Clinical staff begin "
        "reporting EHR application errors as the night shift hands off."
    ),
    "inject_sequence": [
        {
            "time_offset": "T+0min",
            "inject": (
                "Pager fires: anomalous .lockd file extensions on db-ehr-01 "
                "and db-ehr-02. SOC L1 escalates to incident commander."
            ),
            "facilitator_note": (
                "Watch for participants jumping to containment before scoping. "
                "Probe: 'What do you need to know in the first 15 minutes?'"
            ),
        },
        {
            "time_offset": "T+15min",
            "inject": (
                "EHR application down across all 4 hospitals. ED registration "
                "is on paper. Backup integrity status is unknown."
            ),
            "facilitator_note": (
                "This is the critical pressure inject. Score the team on "
                "downtime procedure activation and clinical communication."
            ),
        },
        {
            "time_offset": "T+45min",
            "inject": (
                "Ransom note observed on a clinician workstation demanding "
                "$4.2M in BTC. Threat actor claims 80GB of patient records "
                "exfiltrated."
            ),
            "facilitator_note": (
                "Force the discussion: notify counsel? Engage federal "
                "authorities? Pay vs. restore decision criteria?"
            ),
        },
        {
            "time_offset": "T+90min",
            "inject": (
                "Local TV news reaches out for comment. A board member calls "
                "the CEO directly for an update."
            ),
            "facilitator_note": (
                "Observe whether communications hold the line, and whether "
                "executives respect the comms strategy under social pressure."
            ),
        },
        {
            "time_offset": "T+180min",
            "inject": (
                "Backup team reports the last verified-clean EHR DB backup is "
                "from 26 hours ago. Restore ETA: 6-8 hours."
            ),
            "facilitator_note": (
                "Tie this back to RPO commitments — is the team's RPO actually "
                "achievable given the evidence?"
            ),
        },
    ],
    "discussion_questions": [
        "Who has authority to declare an enterprise incident and when?",
        "How long can ED operate on paper procedures safely?",
        "What is your trigger to publicly disclose, and to whom?",
        "Who decides whether to engage with the threat actor?",
    ],
    "expected_actions": [
        "Activate the EHR downtime procedures within 15 minutes",
        "Engage outside counsel and cyber insurance carrier",
        "Validate backup integrity before any restoration attempt",
        "Stand up a unified incident command with clinical leadership at the table",
        "Coordinate communications across PR, regulators, and the board",
    ],
    "common_pitfalls": [
        "Restoring from unverified backups and re-infecting the environment",
        "Allowing well-meaning staff to interact with the threat actor directly",
        "Forgetting that PHI exfiltration triggers separate regulatory clocks",
        "Treating this as IT-only and excluding clinical leadership from command",
    ],
}


SCENARIO_DATA_BREACH = {
    "title": "Third-party billing vendor breach affects PHI",
    "description": (
        "A managed billing partner (BillCare Solutions) notifies you at 09:30 "
        "that their environment was compromised. Logs indicate access to their "
        "data lake which contains 14 months of patient billing extracts."
    ),
    "inject_sequence": [
        {
            "time_offset": "T+0min",
            "inject": (
                "Vendor notification email arrives. Brief details, "
                "no specific records confirmed exposed yet."
            ),
            "facilitator_note": (
                "Probe assumptions: do participants assume the vendor's framing "
                "or independently scope what was shared with them?"
            ),
        },
        {
            "time_offset": "T+30min",
            "inject": (
                "Privacy officer pulls the BAA — it requires vendor "
                "notification of breach within 24 hours of discovery. The "
                "vendor's email says 'we discovered the activity 19 days ago.'"
            ),
            "facilitator_note": (
                "This is the key inject. Test whether the team treats this as "
                "a contractual issue, a regulatory issue, or both."
            ),
        },
        {
            "time_offset": "T+90min",
            "inject": (
                "Vendor confirms approximately 220,000 patient records "
                "containing SSN, DOB, address, and diagnosis codes were "
                "accessed."
            ),
            "facilitator_note": (
                "Trip wire for the 60-day HIPAA notification clock. Confirm "
                "the team knows the clock starts from discovery."
            ),
        },
        {
            "time_offset": "T+150min",
            "inject": (
                "State AG sends a preservation letter. Plaintiff's firm files "
                "a putative class action."
            ),
            "facilitator_note": (
                "Watch how counsel coordinates with PR and internal forensic "
                "preservation — chain-of-custody matters here."
            ),
        },
    ],
    "discussion_questions": [
        "At what point are you obligated to notify HHS, and what evidence supports the start of the clock?",
        "How do you handle media inquiries before notifying affected patients?",
        "What controls would have surfaced this risk in vendor management?",
    ],
    "expected_actions": [
        "Immediately preserve internal logs and pull the BAA",
        "Engage outside counsel and breach coach within the first hour",
        "Begin scoping the affected record set independently of the vendor",
        "Draft notification timelines based on HIPAA breach rule requirements",
    ],
    "common_pitfalls": [
        "Relying on the vendor's record count and not independently verifying",
        "Missing state-specific breach notification timelines tighter than HIPAA",
        "Notifying patients before counsel finalizes language and evidence preservation",
    ],
}


async def main() -> None:
    async with SessionLocal() as session:
        existing = await session.execute(select(Client).where(Client.name == CLIENT_NAME))
        if existing.scalar_one_or_none():
            print(f"Seed already present (client '{CLIENT_NAME}' exists). Skipping.")
            return

        client = Client(
            name=CLIENT_NAME,
            industry="Healthcare",
            contact_email="ciso@northwind.example",
        )
        session.add(client)
        await session.flush()

        systems = [
            ClientSystem(
                client_id=client.id, system_type=SystemType.database,
                name="EHR primary DB", hostname="db-ehr-01.northwind.local",
                ip_address="10.42.10.11", criticality=Criticality.critical,
                description="Primary Epic Caché EHR database",
            ),
            ClientSystem(
                client_id=client.id, system_type=SystemType.database,
                name="EHR replica DB", hostname="db-ehr-02.northwind.local",
                ip_address="10.42.10.12", criticality=Criticality.critical,
            ),
            ClientSystem(
                client_id=client.id, system_type=SystemType.server,
                name="Backup orchestrator", hostname="bkp-orchestrator.northwind.local",
                ip_address="10.42.20.50", criticality=Criticality.high,
            ),
            ClientSystem(
                client_id=client.id, system_type=SystemType.cloud,
                name="Billing extract data lake", hostname="northwind-billing.s3",
                criticality=Criticality.high,
            ),
            ClientSystem(
                client_id=client.id, system_type=SystemType.endpoint,
                name="Clinician workstations", criticality=Criticality.medium,
                description="~4,500 Windows endpoints across 4 hospitals",
            ),
        ]
        for s in systems:
            session.add(s)

        exercise = Exercise(
            client_id=client.id,
            title="Q2 Multi-Vector Ransomware + Vendor Breach Tabletop",
            description=(
                "Two-scenario session combining a destructive ransomware event "
                "against the EHR cluster with a parallel third-party PHI breach "
                "via the billing vendor."
            ),
            exercise_type=ExerciseType.ransomware,
            status=ExerciseStatus.scenarios_generated,
            scope_notes=(
                "Participants: CIO, CISO, Privacy Officer, GC, CMIO, VP Comms, "
                "VP Patient Access. 3-hour session, in-person + 2 remote."
            ),
            has_client_systems=True,
            scheduled_date=date.today() + timedelta(days=21),
        )
        session.add(exercise)
        await session.flush()

        for data in (SCENARIO_RANSOMWARE, SCENARIO_DATA_BREACH):
            session.add(
                Scenario(
                    exercise_id=exercise.id,
                    title=data["title"],
                    description=data["description"],
                    inject_sequence=data["inject_sequence"],
                    discussion_questions=data["discussion_questions"],
                    expected_actions=data["expected_actions"],
                    common_pitfalls=data["common_pitfalls"],
                    status=ScenarioStatus.draft,
                )
            )

        plan = ExercisePlan(
            exercise_id=exercise.id,
            status=ExercisePlanStatus.draft,
            objectives=[
                "Validate the EHR downtime procedure end-to-end",
                "Test incident command activation and authority escalation",
                "Stress vendor breach notification workflow",
                "Pressure-test executive crisis communications",
            ],
            ground_rules=[
                "All decisions made in the room are exercise decisions only",
                "Time will be paused for clarifying questions when needed",
                "No phones during injects — full attention required",
                "Vegas rule: what is discussed stays in the room",
            ],
            roles=[
                {"role": "Exercise Director", "responsibilities": "Owns the run-of-show and timing."},
                {"role": "Inject Operator", "responsibilities": "Delivers injects on cue."},
                {"role": "Scribe", "responsibilities": "Captures decisions and timestamps."},
            ],
            agenda=[
                {"time": "9:00", "duration_min": 15, "item": "Welcome + objectives", "owner": "Director"},
                {"time": "9:15", "duration_min": 15, "item": "Rules of engagement", "owner": "Director"},
                {"time": "9:30", "duration_min": 75, "item": "Scenario 1: Ransomware", "owner": "Inject Operator"},
                {"time": "10:45", "duration_min": 15, "item": "Break", "owner": "—"},
                {"time": "11:00", "duration_min": 60, "item": "Scenario 2: Vendor Breach", "owner": "Inject Operator"},
                {"time": "12:00", "duration_min": 45, "item": "Hotwash + close", "owner": "Director"},
            ],
            materials_needed=[
                "Projector + HDMI",
                "Printed inject cards (backup)",
                "Whiteboard + markers",
                "Timestamps log for scribe",
            ],
            debrief_structure={
                "sections": ["What went well", "What was hard", "What changes by Monday"],
                "duration_min": 45,
                "facilitator_prompts": [
                    "Walk me through the first 15 minutes of your response.",
                    "What information did you wish you had earlier?",
                    "Where did decision authority feel ambiguous?",
                ],
            },
        )
        session.add(plan)

        await session.commit()
        print(f"Seeded client '{client.name}' with {len(systems)} systems and 1 exercise (2 scenarios, 1 plan).")


if __name__ == "__main__":
    asyncio.run(main())
