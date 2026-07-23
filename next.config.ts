import type { NextConfig } from "next";

/**
 * Local dev uses `.next` (see package.json `dev` script).
 * Local production builds use `.next-build` so `next build` does not clobber the
 * Turbopack dev cache. Vercel requires the standard `.next` output directory.
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

if (
  distDir === ".next" &&
  process.env.VERCEL !== "1" &&
  process.argv.some((arg) => arg.includes("build"))
) {
  throw new Error(
    "Refusing to run `next build` into .next — it corrupts the Turbopack dev cache and causes HTTP 500. Use `npm run build` (.next-build) or `npm run dev` for development."
  );
}

const nextConfig: NextConfig = {
  distDir,
};

export default nextConfig;
