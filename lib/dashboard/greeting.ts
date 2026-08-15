export type TimeGreeting = "Good morning" | "Good afternoon" | "Good evening";

export function getTimeGreeting(date = new Date()): TimeGreeting {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function formatPersonalGreeting(displayName: string, date = new Date()): string {
  const greeting = getTimeGreeting(date);
  const name = displayName.trim() || "there";

  return `${greeting}, ${name}`;
}
