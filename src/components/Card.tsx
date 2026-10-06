import type { ReactNode } from "react";

/** The page's standard section: a rounded card with an eyebrow title and optional controls. */
export function Card({
  title,
  aside,
  children,
  className = "",
  id,
}: {
  id?: string;
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      {title || aside ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="eyebrow">{title}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}
