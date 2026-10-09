import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="sun" aria-hidden="true" />
        <span>
          <span className="brand-name">Morning Brief</span>
          <span className="brand-meta">Kuala Lumpur · 8:00</span>
        </span>
      </Link>
      <nav className="header-actions" aria-label="Pages">
        <Link href="/">Today</Link>
        <Link href="/archive">Archive</Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      Headlines link to the original reporting. The brief is assembled each
      morning and ready by 8:00 in Kuala Lumpur.
    </footer>
  );
}
