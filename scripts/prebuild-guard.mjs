#!/usr/bin/env node

/**
 * Prevent production builds from writing into the Turbopack dev cache (`.next`).
 * Building into `.next` while `next dev` is running corrupts `_buildManifest.js`
 * and causes HTTP 500 on all routes.
 */

const distDir = process.env.NEXT_DIST_DIR ?? ".next-build";

if (distDir === ".next") {
  console.error(
    "[VoltPilot] Refusing to build into .next while using the shared next.config.\n" +
      "Production builds must use .next-build. Run `npm run build` or unset NEXT_DIST_DIR.\n" +
      "For dev, use `npm run dev` (sets NEXT_DIST_DIR=.next)."
  );
  process.exit(1);
}
