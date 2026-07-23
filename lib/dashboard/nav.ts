import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/estimates", label: "Estimates", icon: Building2 },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const PROTECTED_ROUTES = new Set([
  "/dashboard",
  "/ai",
  "/customers",
  "/projects",
  "/estimates",
  "/proposals",
  "/analytics",
  "/settings",
  "/settings/team",
  "/settings/billing",
]);

export function isProtectedRoute(pathname: string) {
  if (PROTECTED_ROUTES.has(pathname)) {
    return true;
  }

  return Array.from(PROTECTED_ROUTES).some((route) =>
    pathname.startsWith(`${route}/`)
  );
}
