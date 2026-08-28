
const TIPI_URL = "https://fantastic-donut-1c4357.netlify.app/";

const connect = [
  { label: "YouTube", href: "https://www.youtube.com/" },
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "Twitter", href: "https://twitter.com/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy text-blue-lighter">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-2">
        <div>
          <img
            src="/tipi-logo.svg"
            alt="The India Prosperity Initiative logo"
            className="h-16 w-auto rounded-md bg-white p-2"
            loading="lazy"
          />

          <p className="mt-4 max-w-sm text-sm text-blue-light">
            India GDP Pulse is the flagship project of The India Prosperity Initiative
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-light">
              Connect
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {connect.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-lighter transition-colors hover:text-cyan-light"
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-light">
              Other links
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href={TIPI_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-lighter transition-colors hover:text-cyan-light"
                >
                  The India Prosperity Initiative
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5">
        <div className="h-px w-full bg-blue-lighter/25" />
        <p className="py-6 text-xs text-blue-light">
          © {new Date().getFullYear()} The India Prosperity Initiative. Images are owned by
          respective owners.
        </p>
      </div>
    </footer>
  );
}
