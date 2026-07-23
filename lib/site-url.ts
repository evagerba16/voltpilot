export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[VoltPilot] NEXT_PUBLIC_SITE_URL is not set. Auth and billing links may be incorrect."
    );
  }

  return "http://localhost:3000";
}
