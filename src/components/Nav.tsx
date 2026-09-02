"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links: Array<[string, string]> = [
  ["/live", "Live"],
  ["/trending", "Trending"],
  ["/clips", "Clips"],
  ["/radar", "Clip Radar"],
  ["/library", "Library"],
  ["/settings", "Settings"]
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      <Link href="/" className="brand"><span className="brand-dot" />Clipped It</Link>
      <div className="nav-links">
        {links.map(([href, label]) => <Link key={href} href={href} className={isActive(pathname, href) ? "active" : ""}>{label}</Link>)}
      </div>
      <span className="nav-spacer" />
    </nav>
  );
}

const icons: Record<string, ReactNode> = {
  "/": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-8 9 8" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  "/live": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M6.3 6.3a8 8 0 000 11.4M17.7 6.3a8 8 0 010 11.4" strokeLinecap="round" /></svg>,
  "/trending": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 7v5h-5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  "/clips": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.5 15.5M14.5 14.5L20 20M8.5 8.5L11 11" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  "/radar": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>,
  "/library": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v16l-8-4-8 4V5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
};

const tabs: Array<[string, string]> = [["/live", "Live"], ["/trending", "Trending"], ["/clips", "Clips"], ["/radar", "Radar"], ["/library", "Library"]];

export function BottomNav() {
  const pathname = usePathname();
  return <nav className="bottomnav">{tabs.map(([href, label]) => <Link key={href} href={href} className={`tab ${isActive(pathname, href) ? "active" : ""}`}>{icons[href]}{label}</Link>)}</nav>;
}
