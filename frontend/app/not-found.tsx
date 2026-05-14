import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-12 max-w-2xl p-8 text-center">
      <div className="mx-auto mb-3 font-mono text-3xl font-bold text-ink-muted">404</div>
      <h2 className="text-lg font-semibold text-ink">Page not found</h2>
      <p className="mt-2 text-sm text-ink-muted">
        The page you were looking for does not exist.
      </p>
      <Link href="/" className="btn-primary mt-5 inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}
