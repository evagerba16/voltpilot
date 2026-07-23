"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { useDashboard } from "@/components/dashboard/dashboard-context";

function getInitials(email: string) {
  const localPart = email.split("@")[0] ?? "User";
  const parts = localPart.split(/[._-]/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { userEmail } = useDashboard();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 transition-colors hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(userEmail)}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium lg:inline">
          {userEmail}
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{userEmail}</p>
            <p className="text-xs text-muted-foreground">Account</p>
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <User className="size-4" />
            Profile
          </Link>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Settings className="size-4" />
            Settings
          </Link>

          <form className="border-t border-border pt-1">
            <button
              type="submit"
              formAction={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
