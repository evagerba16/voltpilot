"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SETTINGS_LINKS = [
  { href: "/settings", label: "Company" },
  { href: "/settings/equipment", label: "Equipment" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/billing", label: "Billing" },
];

type SettingsNavProps = {
  showTeam?: boolean;
  showBilling?: boolean;
};

export function SettingsNav({
  showTeam = true,
  showBilling = false,
}: SettingsNavProps) {
  const pathname = usePathname();
  const links = SETTINGS_LINKS.filter((link) => {
    if (link.href === "/settings/team" && !showTeam) {
      return false;
    }

    if (link.href === "/settings/billing" && !showBilling) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex gap-2 border-b border-border">
      {links.map((link) => {
        const isActive =
          link.href === "/settings"
            ? pathname === "/settings"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
