import { cn } from "@/lib/utils";
import {
  getCustomerAvatarColor,
  getCustomerInitials,
} from "@/lib/customers/avatar";

type CustomerAvatarProps = {
  companyName: string;
  contactName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
};

export function CustomerAvatar({
  companyName,
  contactName,
  size = "md",
  className,
}: CustomerAvatarProps) {
  const initials = getCustomerInitials(companyName, contactName);
  const colorClass = getCustomerAvatarColor(companyName);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-semibold",
        sizeClasses[size],
        colorClass,
        className
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
