interface Delta {
  value: number;
  trend: "up" | "down";
}

interface Props {
  label: string;
  value: number | string;
  delta?: Delta;
  hint?: string;
}

export default function StatCard({ label, value, delta, hint }: Props) {
  return (
    <div className="card-accent group p-5">
      <div className="label">{label}</div>
      <div className="mt-2 flex items-end gap-3">
        <div className="text-3xl font-semibold tracking-tight text-ink">
          {value}
        </div>
        {delta && (
          <div
            className={`mb-1 flex items-center gap-1 text-xs font-medium ${
              delta.trend === "up" ? "text-accent-300" : "text-red-300"
            }`}
          >
            {delta.trend === "up" ? (
              <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                <path d="M6 2 l4 5 l-2.5 0 l0 3 l-3 0 l0 -3 l-2.5 0 z" />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                <path d="M6 10 l-4 -5 l2.5 0 l0 -3 l3 0 l0 3 l2.5 0 z" />
              </svg>
            )}
            <span>{delta.value}%</span>
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-dim">{hint}</div>}
    </div>
  );
}
