import { Link } from "@tanstack/react-router";
import type { Mover } from "@/lib/series";

function Column({ title, items }: { title: string; items: Mover[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((m) => {
          const up = m.change >= 0;
          return (
            <li key={m.id}>
              <Link
                to="/indicator/$id"
                params={{ id: m.id }}
                className="flex items-baseline justify-between gap-3 text-sm text-navy hover:underline"
              >
                <span className="min-w-0 truncate">{m.name}</span>
                <span
                  className={`shrink-0 font-mono text-xs ${up ? "text-trend-up" : "text-trend-down"}`}
                >
                  {up ? "↑ +" : "↓ −"}
                  {Math.abs(m.change).toFixed(1)}%
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Pulling up" / "weighing down" lists: the n best and n worst movers. */
export function MoverLists({ items, n = 3 }: { items: Mover[]; n?: number }) {
  const up = items.filter((m) => m.change > 0).slice(0, n);
  const down = items
    .filter((m) => m.change < 0)
    .slice(-n)
    .reverse();
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Column title="Pulling up" items={up} />
      <Column title="Weighing down" items={down} />
    </div>
  );
}
