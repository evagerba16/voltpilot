/** Build an invite URL for the current browser origin (correct localhost port + production host). */
export function buildInviteUrlForCurrentOrigin(token: string) {
  const trimmed = token.trim();
  if (!trimmed) {
    return "";
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/invite/${trimmed}`;
  }

  return `/invite/${trimmed}`;
}
