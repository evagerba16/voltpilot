import type { NextConfig } from "next";

/**
 * Next.js and Vercel always expect the default `.next` output directory.
 * For optional local production builds that must not clobber a running dev
 * server, use `npm run build:local` (writes to `.next-build` via VOLTPILOT_DIST_DIR).
 */
const nextConfig: NextConfig = {
  ...(process.env.VOLTPILOT_DIST_DIR
    ? { distDir: process.env.VOLTPILOT_DIST_DIR }
    : {}),
};

export default nextConfig;
