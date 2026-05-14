import Link from "next/link";
import { Fragment } from "react";

interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <svg viewBox="0 0 20 20" className="h-3 w-3 fill-ink-dim">
              <path d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" />
            </svg>
          )}
          {item.href ? (
            <Link href={item.href} className="text-ink-muted transition hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
