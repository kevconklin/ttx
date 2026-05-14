"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto mt-12 max-w-2xl p-8 text-center">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-red-500/10 ring-1 ring-inset ring-red-500/40">
        <span className="font-mono text-sm text-red-300">!</span>
      </div>
      <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
