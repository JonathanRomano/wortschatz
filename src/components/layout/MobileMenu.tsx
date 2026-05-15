"use client";

import { useEffect, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

type NavLink = { href: string; label: string };

type Props = {
  isAuthed: boolean;
  links: NavLink[];
  signOutSlot: React.ReactNode;
  labels: {
    openMenu: string;
    closeMenu: string;
    menu: string;
    login: string;
    register: string;
    language: string;
  };
};

export function MobileMenu({ isAuthed, links, signOutSlot, labels }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? labels.closeMenu : labels.openMenu}
        aria-expanded={open}
        aria-controls="mobile-menu-drawer"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-muted md:hidden"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        id="mobile-menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={labels.menu}
        className={`fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-base font-semibold">{labels.menu}</span>
          <button
            type="button"
            aria-label={labels.closeMenu}
            onClick={() => setOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          {isAuthed ? (
            <ul className="flex flex-col gap-1 text-base">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-11 items-center rounded-md px-3 py-3 hover:bg-muted hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2 text-base">
              <li>
                <Link
                  href="/login"
                  className="flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-3 hover:bg-muted"
                >
                  {labels.login}
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground hover:opacity-90"
                >
                  {labels.register}
                </Link>
              </li>
            </ul>
          )}
        </nav>

        <div className="space-y-3 border-t border-border px-4 py-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              {labels.language}
            </p>
            <LocaleSwitcher />
          </div>
          {signOutSlot ? <div>{signOutSlot}</div> : null}
        </div>
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
