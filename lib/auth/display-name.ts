import type { User } from "@supabase/supabase-js";

function firstToken(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
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
