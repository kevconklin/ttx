"use client";

interface Props {
  text: string;
  state: "idle" | "streaming" | "done" | "error";
  title?: string;
}

/**
 * Live console-style preview of streamed model output. Header shows a pulsing
 * emerald dot while streaming, then a steady accent indicator on completion.
 */
export default function StreamingPreview({ text, state, title = "Generating..." }: Props) {
  if (state === "idle" || (state === "done" && !text)) return null;

  const statusLabel =
    state === "streaming"
      ? "streaming"
      : state === "done"
        ? "complete"
        : "error";

  const dotClass =
    state === "streaming"
      ? "bg-accent-400 animate-soft-pulse"
      : state === "done"
        ? "bg-accent-400"
        : "bg-red-400";

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-[#070b14]">
      <div className="flex items-center justify-between border-b border-border/60 bg-surface2 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          <span className="text-[12px] font-medium tracking-tight text-ink">{title}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          {statusLabel}
        </span>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-[11.5px] leading-relaxed text-ink/90">
        {text || " "}
      </pre>
    </div>
  );
}
