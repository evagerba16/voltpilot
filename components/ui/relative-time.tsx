"use client";

import { useEffect, useState } from "react";

function formatShortTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelativeTime(value: string, now: number) {
  const diff = now - new Date(value).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

type RelativeTimeProps = {
  value: string;
  className?: string;
};

export function RelativeTime({ value, className }: RelativeTimeProps) {
  const [label, setLabel] = useState(() => formatShortTimestamp(value));

  useEffect(() => {
    function update() {
      setLabel(formatRelativeTime(value, Date.now()));
    }

    update();
    const intervalId = window.setInterval(update, 60_000);
    return () => window.clearInterval(intervalId);
  }, [value]);

  return <span className={className}>{label}</span>;
}
