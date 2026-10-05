import { getSiteUrl } from "@/lib/site-url";

/**
 * Supabase only honors redirect_to values on the project's redirect URL allowlist.
 * When rejected, links fall back to Site URL (homepage) and recovery tokens land in the hash
 * on `/` instead of `/auth/callback`, which breaks password reset.
 */
const AUTH_ORIGIN_OVERRIDES: Record<string, string> = {
  "https://voltpilot.io": "https://www.voltpilot.io",
  "https://voltpilot-vert.vercel.app": "https://www.voltpilot.io",
};

export function getAuthCallbackOrigin() {
  const site = getSiteUrl().replace(/\/$/, "");
  return AUTH_ORIGIN_OVERRIDES[site] ?? site;
}

function isLocalDevSite(site: string) {
  return /localhost|127\.0\.0\.1/i.test(site);
}

export function buildAuthCallbackRedirect(nextPath: string) {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const site = getSiteUrl().replace(/\/$/, "");
  const origin = getAuthCallbackOrigin();

  /**
   * Reset requested on localhost cannot PKCE-exchange on production (verifier cookie is on
   * localhost). Use production Site URL so Supabase returns tokens in the hash on www;
   * RecoveryHashLandingRedirect + RecoveryHashSessionBootstrap complete the flow there.
   */
  if (isLocalDevSite(site)) {
    return "https://www.voltpilot.io";
  }

  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
