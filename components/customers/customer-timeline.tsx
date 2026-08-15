"use client";

import Link from "next/link";
import {
  Eye,
  FileText,
  FolderKanban,
  Hammer,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  ScrollText,
  Send,
  Sparkles,
  Upload,
  User,
} from "lucide-react";

import { CustomerAvatar } from "@/components/customers/customer-avatar";
import type { CustomerTimelineEventType } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

const TIMELINE_ICONS: Record<
  CustomerTimelineEventType,
  React.ComponentType<{ className?: string }>
> = {
  customer_created: User,
  customer_updated: Sparkles,
  note_added: MessageSquare,
  document_uploaded: Upload,
  project_created: FolderKanban,
  project_started: Hammer,
  estimate_created: ScrollText,
  proposal_sent: Send,
  proposal_viewed: Eye,
  proposal_accepted: FileText,
  invoice_paid: Receipt,
};

const TIMELINE_COLORS: Record<CustomerTimelineEventType, string> = {
  customer_created: "bg-primary/10 text-primary",
  customer_updated: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  note_added: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  document_uploaded: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  project_created: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  project_started: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  estimate_created: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  proposal_sent: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  proposal_viewed: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  proposal_accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  invoice_paid: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

type CustomerTimelineProps = {
  events: Array<{
    id: string;
    type: CustomerTimelineEventType;
    title: string;
    description: string;
    timestamp: string;
    href?: string;
  }>;
  formatTimestamp: (value: string) => string;
};

export function CustomerTimeline({ events, formatTimestamp }: CustomerTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Activity will appear here as you add notes, upload documents, and link projects.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const Icon = TIMELINE_ICONS[event.type];
        const content = (
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  TIMELINE_COLORS[event.type]
                )}
              >
                <Icon className="size-4" />
              </div>
              {index < events.length - 1 ? (
                <div className="mt-2 w-px flex-1 bg-border" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{event.title}</p>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            </div>
          </div>
        );

        if (event.href) {
          return (
            <Link
              key={event.id}
              href={event.href}
              className="block rounded-xl transition-colors hover:bg-muted/20"
            >
              {content}
            </Link>
          );
        }

        return <div key={event.id}>{content}</div>;
      })}
    </div>
  );
}

export function CustomerContactSidebar({
  companyName,
  contactName,
  email,
  phoneNumber,
  projectAddress,
  compact = false,
}: {
  companyName: string;
  contactName: string;
  email: string;
  phoneNumber: string | null;
  projectAddress: string | null;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">Phone & address</h2>
        <div className="mt-5 space-y-4 text-sm">
          <ContactRow
            icon={Phone}
            label="Phone"
            value={phoneNumber || "—"}
            href={phoneNumber ? `tel:${phoneNumber}` : undefined}
          />
          <ContactRow
            icon={MapPin}
            label="Address"
            value={projectAddress || "—"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <CustomerAvatar companyName={companyName} contactName={contactName} size="md" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Contact information</h2>
          <p className="text-sm text-muted-foreground">{contactName}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 text-sm">
        <ContactRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
        <ContactRow
          icon={Phone}
          label="Phone"
          value={phoneNumber || "—"}
          href={phoneNumber ? `tel:${phoneNumber}` : undefined}
        />
        <ContactRow
          icon={MapPin}
          label="Address"
          value={projectAddress || "—"}
        />
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        {href && value !== "—" ? (
          <a href={href} className="break-all text-primary hover:underline">
            {value}
          </a>
        ) : (
          <span className="break-words text-foreground">{value}</span>
        )}
      </div>
    </div>
  );
}
