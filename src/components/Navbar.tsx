"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/find-a-driver", label: "Find a Driver" },
  { href: "/services", label: "Services" },
  { href: "/drivers", label: "For Drivers" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Whether the visitor is signed in. Starts false so the server-rendered HTML
  // and first client render match (no hydration mismatch) and signed-out
  // visitors — the majority — see the correct CTAs immediately. Confirmed on
  // mount via the read-only /api/me probe; localStorage gives returning
  // signed-in drivers an instant correct render with no flash.
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Resolve signed-in state so we never show "Sign in / Become a driver" to a
  // driver who's already logged in.
  useEffect(() => {
    try {
      if (localStorage.getItem("fs_authed") === "1") setAuthed(true);
    } catch {}
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { authed: false }))
      .then((d: { authed?: boolean }) => {
        if (!alive) return;
        setAuthed(!!d.authed);
        try {
          localStorage.setItem("fs_authed", d.authed ? "1" : "0");
        } catch {}
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2" aria-label="FlowSync home">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight">
            Flow<span className="text-accent">Sync</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm transition-colors hover:text-foreground ${
                pathname === l.href ? "text-foreground" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {authed ? (
            <>
              <form action={logout}>
                <button type="submit" className="text-sm text-muted transition-colors hover:text-foreground">
                  Sign out
                </button>
              </form>
              <Link href="/account" className="btn-primary rounded-full px-5 py-2 text-sm">
                My account
              </Link>
            </>
          ) : (
            <>
              <Link href="/signin" className="text-sm text-muted transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link href="/pricing" className="btn-primary rounded-full px-5 py-2 text-sm">
                Become a driver
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-foreground transition-all ${
                open ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-foreground transition-all ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-foreground transition-all ${
                open ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-muted hover:bg-surface hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {authed ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm text-muted hover:bg-surface hover:text-foreground"
                >
                  My account
                </Link>
                <form action={logout} className="mt-2">
                  <button
                    type="submit"
                    className="btn-ghost w-full rounded-full px-5 py-3 text-center text-sm"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm text-muted hover:bg-surface hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-2 rounded-full px-5 py-3 text-center text-sm"
                >
                  Become a driver
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
