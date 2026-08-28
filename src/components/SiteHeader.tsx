import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/", label: "GDP Pulse", exact: true },
  { to: "/indicators", label: "Indicators", exact: false },
  { to: "/methodology", label: "Methodology", exact: false },
] as const;

export function SiteHeader({ subtitle }: { subtitle?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const base =
    "relative px-1 pb-1 font-sans text-[13px] tracking-tight transition-colors text-blue-dark/80 hover:text-navy";
  const active =
    "relative px-1 pb-1 font-sans text-[13px] tracking-tight text-navy after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-blue-brand after:content-['']";

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md transition-all duration-300 ${
        scrolled ? "border-border shadow-[0_1px_0_0_var(--color-border)]" : "border-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 transition-all duration-300 ${
          scrolled ? "py-2.5" : "py-4"
        }`}
      >
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/tipi-logo.svg"
            alt="The India Prosperity Initiative logo"
            className={`w-auto shrink-0 transition-all duration-300 ${scrolled ? "h-7" : "h-9"}`}
          />
          <span className="min-w-0">
            <span className="block truncate font-sans text-[15px] font-semibold tracking-[-0.01em] text-navy">
              India GDP Pulse
            </span>
            {subtitle && !scrolled ? (
              <span className="block truncate text-[11px] text-blue-dark/70">{subtitle}</span>
            ) : null}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className={base}
              activeProps={{ className: active }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-sm border border-border px-2.5 py-1.5 text-navy transition-colors hover:bg-accent/60 sm:hidden"
        >
          <span className="block h-px w-4 bg-current" />
          <span className="mt-1 block h-px w-4 bg-current" />
          <span className="mt-1 block h-px w-4 bg-current" />
        </button>
      </div>

      {open ? (
        <nav className="animate-fade-up border-t border-border bg-background px-5 py-3 sm:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm text-blue-dark"
              activeProps={{ className: "block py-2 text-sm font-medium text-navy" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
