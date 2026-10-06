import { Link } from "@tanstack/react-router";
import { Pct } from "@/components/Pct";
import type { Mover } from "@/lib/series";

function Column({ title, items }: { title: string; items: Mover[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((m) => {
          return (
            <li key={m.id}>
              <Link
                to="/indicator/$id"
                params={{ id: m.id }}
                className="flex items-baseline justify-between gap-3 text-sm text-navy hover:underline"
              >
                <span className="min-w-0 truncate">{m.name}</span>
                <Pct v={m.change} className="shrink-0 text-xs" />
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
