import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type AlertBannerVariant = "error" | "success" | "info";

type AlertBannerProps = {
  variant?: AlertBannerVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<AlertBannerVariant, string> = {
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  info: "border-border bg-muted/30 text-foreground",
};

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export function AlertBanner({
  variant = "info",
  title,
  children,
  className,
}: AlertBannerProps) {
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm",
        variantStyles[variant],
        className
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={cn(title ? "mt-0.5 opacity-90" : "")}>{children}</div>
      </div>
    </div>
  );
}
