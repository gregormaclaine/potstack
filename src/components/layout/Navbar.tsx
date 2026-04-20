"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clsx } from "clsx";
import InviteBadge from "@/components/layout/InviteBadge";
import UserAvatar from "@/components/ui/UserAvatar";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sessions", label: "Sessions" },
  { href: "/players", label: "Players" },
  { href: "/breakdowns", label: "Breakdowns" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMenuEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenuOpen(true);
  }
  function handleMenuLeave() {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150);
  }
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);


  const isAuthPage =
    pathname === "/login" || pathname === "/register" || pathname === "/";
  if (isAuthPage) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight text-emerald-400"
        >
          PotStack
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden sm:flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                                    className={clsx(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
          {session?.user?.isAdmin && (
            <li>
              <Link
                href="/admin"
                                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === "/admin"
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                )}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Admin
              </Link>
            </li>
          )}
        </ul>

        {/* Desktop user menu — hover dropdown */}
        {session?.user && (
          <div
            className="relative hidden sm:block"
            onMouseEnter={handleMenuEnter}
            onMouseLeave={handleMenuLeave}
          >
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200">
              <UserAvatar avatarId={session.user.avatar} size="xs" />
              <span className="font-bold">{session.user.name}</span>
              <InviteBadge />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 pt-1">
                <div className="min-w-44 rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                  <div className="flex items-center gap-2.5 border-b border-zinc-800 px-4 py-2.5">
                    <UserAvatar avatarId={session.user.avatar} size="sm" />
                    <p className="text-sm font-bold text-zinc-200">@{session.user.name}</p>
                  </div>
                  <Link
                    href="/profile"
                    className={clsx(
                      "flex items-center gap-1.5 px-4 py-2 text-sm transition-colors hover:bg-zinc-800",
                      pathname === "/profile" ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/notifications"
                    className={clsx(
                      "flex items-center gap-1.5 px-4 py-2 text-sm transition-colors hover:bg-zinc-800",
                      pathname === "/notifications" ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Notifications
                    <InviteBadge />
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hamburger button */}
        <button
          className="sm:hidden rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-zinc-800 bg-zinc-950 px-4 pb-4 pt-2">
          <ul className="flex flex-col gap-1">
            {links.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
            {session?.user?.isAdmin && (
              <li>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/admin"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Admin
                </Link>
              </li>
            )}
          </ul>

          {/* Mobile user section — always visible in hamburger */}
          {session?.user && (
            <div className="mt-3 border-t border-zinc-800 pt-3 space-y-1">
              <div className="flex items-center gap-2 px-3 py-1">
                <UserAvatar avatarId={session.user.avatar} size="xs" />
                <p className="text-xs font-bold text-zinc-600">
                  @{session.user.name}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/profile"
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                )}
              >
                Profile
              </Link>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/notifications"
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                )}
              >
                Notifications
                <InviteBadge />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
