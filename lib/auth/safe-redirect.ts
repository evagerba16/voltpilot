export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard"
) {
  const next = (value ?? fallback).trim();

  if (!next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}
