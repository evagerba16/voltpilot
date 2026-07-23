#!/usr/bin/env node

/**
 * Prevent local production builds from writing into the Turbopack dev cache (`.next`).
 * Building into `.next` while `next dev` is running corrupts `_buildManifest.js`
 * and causes HTTP 500 on all routes.
 *
 * Vercel sets VERCEL=1 and must output to `.next` for deployment.
 */

function resolveDistDir() {
  if (process.env.NEXT_DIST_DIR) {
    return process.env.NEXT_DIST_DIR;
  }

  if (process.env.VERCEL === "1") {
    return ".next";
  }

  return ".next-build";
}

const distDir = resolveDistDir();

if (distDir === ".next" && process.env.VERCEL !== "1") {
  console.error(
    "[VoltPilot] Refusing to build into .next while using the shared next.config.\n" +
      "Production builds must use .next-build. Run `npm run build` or unset NEXT_DIST_DIR.\n" +
      "For dev, use `npm run dev` (sets NEXT_DIST_DIR=.next)."
  );
  process.exit(1);
}
