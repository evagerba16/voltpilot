import Link from "next/link";
import { Zap } from "lucide-react";

import { NavAuth } from "@/components/landing/nav-auth";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#why-voltpilot", label: "Why VoltPilot" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          <span>VoltPilot</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NavAuth />
        </div>
      </div>
    </header>
  );
}
