"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/tasks", label: "Tasks" },
  { href: "/renewals", label: "Renewals" },
  { href: "/ask", label: "Ask Copilot" },
  { href: "/model", label: "Model" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="side-head">
        <Link href="/" className="brand">
          <span className="logo">CH</span>
          <span>Customer Health Copilot</span>
        </Link>
        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="side-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <nav id="side-nav" className="side-nav" aria-label="Main">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={isActive(l.href) ? "active" : undefined}
            aria-current={isActive(l.href) ? "page" : undefined}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="side-foot">
        <ThemeToggle />
        <span className="sim">Simulated data</span>
      </div>
    </aside>
  );
}
