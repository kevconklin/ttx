import type { ExerciseStatus } from "@/types";

const STEPS: { key: ExerciseStatus; label: string }[] = [
  { key: "scoping", label: "Scoping" },
  { key: "scenarios_generated", label: "Scenarios" },
  { key: "sent_for_review", label: "Review" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

interface Props {
  current: ExerciseStatus;
}

export default function StatusTimeline({ current }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIdx;
        const isCurrent = index === currentIdx;
        const isUpcoming = index > currentIdx;

        const nextIsCompletedOrCurrent = index < currentIdx;

        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full border-2 transition ${
                  isCompleted
                    ? "border-accent-500 bg-accent-500"
                    : isCurrent
                      ? "border-accent-500 bg-surface shadow-glow-emerald"
                      : "border-border bg-surface"
                }`}
              >
                {isCompleted ? (
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current text-bg">
                    <path d="M16.704 5.296a1 1 0 0 1 0 1.408l-7.5 7.5a1 1 0 0 1-1.408 0l-3.5-3.5a1 1 0 1 1 1.408-1.408L8.5 12.092l6.796-6.796a1 1 0 0 1 1.408 0z" />
                  </svg>
                ) : (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isCurrent ? "bg-accent-400 animate-soft-pulse" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <div
                className={`mt-2 whitespace-nowrap text-[11px] font-medium tracking-tight ${
                  isUpcoming ? "text-ink-dim" : "text-ink"
                }`}
              >
                {step.label}
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-2 h-px flex-1 transition ${
                  nextIsCompletedOrCurrent ? "bg-accent-500/60" : "bg-divider"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
