import Link from "next/link";
import type { ReactNode } from "react";

import { getSiteContactMailto } from "@/lib/site/contact";
import { cn } from "@/lib/utils";

type ContactSupportLinkProps = {
  subject?: string;
  className?: string;
  children?: ReactNode;
};

export function ContactSupportLink({
  subject = "VoltPilot support",
  className,
  children = "Email our team",
}: ContactSupportLinkProps) {
  return (
    <Link
      href={getSiteContactMailto(subject)}
      className={cn(
        "font-medium text-foreground underline-offset-4 hover:underline",
        className
      )}
    >
      {children}
    </Link>
  );
}
