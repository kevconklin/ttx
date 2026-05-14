import type { ExerciseStatus, OverallRating, ScenarioStatus } from "@/types";

const EXERCISE_STATUS_CLASS: Record<ExerciseStatus, string> = {
  scoping: "badge-neutral",
  scenarios_generated: "badge-accent",
  sent_for_review: "badge-warn",
  in_progress: "badge-info",
  completed: "badge-success",
};

const EXERCISE_STATUS_DOT: Record<ExerciseStatus, string> = {
  scoping: "bg-slate-400",
  scenarios_generated: "bg-accent-400",
  sent_for_review: "bg-amber-400",
  in_progress: "bg-blue-400",
  completed: "bg-emerald-400",
};

const SCENARIO_STATUS_CLASS: Record<ScenarioStatus, string> = {
  draft: "badge-neutral",
  approved: "badge-success",
  rejected: "badge-danger",
};

const SCENARIO_STATUS_DOT: Record<ScenarioStatus, string> = {
  draft: "bg-slate-400",
  approved: "bg-accent-400",
  rejected: "bg-red-400",
};

const RATING_CLASS: Record<OverallRating, string> = {
  excellent: "badge-success",
  satisfactory: "badge-info",
  needs_improvement: "badge-warn",
  unsatisfactory: "badge-danger",
};

const RATING_DOT: Record<OverallRating, string> = {
  excellent: "bg-emerald-400",
  satisfactory: "bg-blue-400",
  needs_improvement: "bg-amber-400",
  unsatisfactory: "bg-red-400",
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function ExerciseStatusBadge({ status }: { status: ExerciseStatus }) {
  return (
    <span className={EXERCISE_STATUS_CLASS[status]}>
      <span className={`badge-dot ${EXERCISE_STATUS_DOT[status]}`} />
      {label(status)}
    </span>
  );
}

export function ScenarioStatusBadge({ status }: { status: ScenarioStatus }) {
  return (
    <span className={SCENARIO_STATUS_CLASS[status]}>
      <span className={`badge-dot ${SCENARIO_STATUS_DOT[status]}`} />
      {label(status)}
    </span>
  );
}

export function RatingBadge({ rating }: { rating: OverallRating }) {
  return (
    <span className={RATING_CLASS[rating]}>
      <span className={`badge-dot ${RATING_DOT[rating]}`} />
      {label(rating)}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity?: string }) {
  if (!severity) return null;
  const map: Record<string, string> = {
    critical: "badge-danger",
    high: "badge-warn",
    medium: "badge-info",
    low: "badge-neutral",
  };
  return <span className={map[severity] ?? "badge-neutral"}>{severity}</span>;
}

export function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const map: Record<string, string> = {
    high: "badge-danger",
    medium: "badge-warn",
    low: "badge-neutral",
  };
  return <span className={map[priority] ?? "badge-neutral"}>{priority}</span>;
}
