"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    system_type = postgresql.ENUM(
        "server", "database", "network_device", "endpoint", "cloud", "other",
        name="system_type", create_type=False,
    )
    criticality = postgresql.ENUM(
        "critical", "high", "medium", "low",
        name="criticality", create_type=False,
    )
    exercise_type = postgresql.ENUM(
        "backup_recovery", "incident_response", "ransomware",
        "data_breach", "business_continuity", "custom",
        name="exercise_type", create_type=False,
    )
    exercise_status = postgresql.ENUM(
        "scoping", "scenarios_generated", "sent_for_review", "in_progress", "completed",
        name="exercise_status", create_type=False,
    )
    scenario_status = postgresql.ENUM(
        "draft", "approved", "rejected",
        name="scenario_status", create_type=False,
    )
    plan_status = postgresql.ENUM(
        "draft", "sent", "approved",
        name="exercise_plan_status", create_type=False,
    )
    overall_rating = postgresql.ENUM(
        "excellent", "satisfactory", "needs_improvement", "unsatisfactory",
        name="overall_rating", create_type=False,
    )

    bind = op.get_bind()
    for enum in (
        system_type, criticality, exercise_type, exercise_status,
        scenario_status, plan_status, overall_rating,
    ):
        enum.create(bind, checkfirst=True)

    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(255), nullable=True),
        sa.Column("contact_email", sa.String(320), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "client_systems",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("system_type", system_type, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("hostname", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("criticality", criticality, nullable=False, server_default="medium"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_client_systems_client_id", "client_systems", ["client_id"])

    op.create_table(
        "exercises",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("exercise_type", exercise_type, nullable=False),
        sa.Column("status", exercise_status, nullable=False, server_default="scoping"),
        sa.Column("scope_notes", sa.Text(), nullable=True),
        sa.Column("has_client_systems", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("scheduled_date", sa.Date(), nullable=True),
        sa.Column("completed_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_exercises_client_id", "exercises", ["client_id"])
    op.create_index("ix_exercises_status", "exercises", ["status"])

    op.create_table(
        "scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exercise_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("inject_sequence", postgresql.JSONB(), nullable=True),
        sa.Column("discussion_questions", postgresql.JSONB(), nullable=True),
        sa.Column("expected_actions", postgresql.JSONB(), nullable=True),
        sa.Column("common_pitfalls", postgresql.JSONB(), nullable=True),
        sa.Column("status", scenario_status, nullable=False, server_default="draft"),
        sa.Column("client_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_scenarios_exercise_id", "scenarios", ["exercise_id"])

    op.create_table(
        "exercise_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exercise_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("agenda", postgresql.JSONB(), nullable=True),
        sa.Column("objectives", postgresql.JSONB(), nullable=True),
        sa.Column("participants", postgresql.JSONB(), nullable=True),
        sa.Column("ground_rules", postgresql.JSONB(), nullable=True),
        sa.Column("roles", postgresql.JSONB(), nullable=True),
        sa.Column("materials_needed", postgresql.JSONB(), nullable=True),
        sa.Column("debrief_structure", postgresql.JSONB(), nullable=True),
        sa.Column("logistics_notes", sa.Text(), nullable=True),
        sa.Column("status", plan_status, nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "after_action_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exercise_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("executive_summary", sa.Text(), nullable=True),
        sa.Column("strengths", postgresql.JSONB(), nullable=True),
        sa.Column("gaps_identified", postgresql.JSONB(), nullable=True),
        sa.Column("recommendations", postgresql.JSONB(), nullable=True),
        sa.Column("action_items", postgresql.JSONB(), nullable=True),
        sa.Column("overall_rating", overall_rating, nullable=True),
        sa.Column("raw_notes", sa.Text(), nullable=True),
        sa.Column("facilitator_notes", sa.Text(), nullable=True),
        sa.Column("participant_feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("after_action_reports")
    op.drop_table("exercise_plans")
    op.drop_index("ix_scenarios_exercise_id", table_name="scenarios")
    op.drop_table("scenarios")
    op.drop_index("ix_exercises_status", table_name="exercises")
    op.drop_index("ix_exercises_client_id", table_name="exercises")
    op.drop_table("exercises")
    op.drop_index("ix_client_systems_client_id", table_name="client_systems")
    op.drop_table("client_systems")
    op.drop_table("clients")

    for name in (
        "overall_rating", "exercise_plan_status", "scenario_status",
        "exercise_status", "exercise_type", "criticality", "system_type",
    ):
        op.execute(f"DROP TYPE IF EXISTS {name}")
