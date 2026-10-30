import type { ReactNode } from "react";

/** A card that starts closed: the title and one line say what is inside, and the body opens on request. */
export function CollapsibleCard({
  title,
  summary,
  children,
  id,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-border bg-card">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="eyebrow block">{title}</span>
            <span className="mt-1 block text-sm text-blue-dark">{summary}</span>
          </span>
          <span className="shrink-0 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-navy group-open:hidden">
            Show
          </span>
          <span className="hidden shrink-0 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-navy group-open:inline">
            Hide
          </span>
        </summary>
        <div className="border-t border-border p-5 sm:p-6">{children}</div>
      </details>
    </section>
  );
}
