import Link from "next/link";
import { FileText, FolderKanban, PencilLine, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    label: "New Estimate",
    href: "/estimates",
    icon: PencilLine,
  },
  {
    label: "New Proposal",
    href: "/proposals",
    icon: FileText,
  },
  {
    label: "Add Project",
    href: "/projects/new",
    icon: FolderKanban,
  },
  {
    label: "Add Customer",
    href: "/customers",
    icon: Users,
  },
];

export function DashboardQuickActions() {
  return (
    <section className="rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Quick actions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-2 rounded-full border-border/80 bg-background px-3.5 font-normal"
              )}
            >
              <Icon className="size-3.5" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
