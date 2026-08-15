import type { User } from "@supabase/supabase-js";

function firstToken(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

/** Prefer team profile name; never derive display name from email local-part. */
export function resolveDisplayName(
  teamDisplayName: string | null | undefined,
  user: User | null | undefined
): string {
  const fromTeam = teamDisplayName?.trim();
  if (fromTeam) {
    return fromTeam;
  }

  const metadata = user?.user_metadata ?? {};
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.first_name,
    metadata.given_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "there";
}

export function getUserFirstName(user: User | null | undefined): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  const candidates = [
    metadata.first_name,
    metadata.given_name,
    metadata.full_name,
    metadata.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const firstName = firstToken(candidate);
      if (firstName) {
        return firstName;
      }
    }
  }

  return null;
}
