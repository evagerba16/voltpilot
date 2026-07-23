import type { NextConfig } from "next";

if (
  process.env.NEXT_DIST_DIR === ".next" &&
  process.argv.some((arg) => arg.includes("build"))
) {
  throw new Error(
    "Refusing to run `next build` into .next — it corrupts the Turbopack dev cache and causes HTTP 500. Use `npm run build` (.next-build) or `npm run dev` for development."
  );
}

const nextConfig: NextConfig = {
  // Default production output to `.next-build` so `next build` never clobbers the
  // Turbopack dev cache in `.next` (which causes ENOENT 500s on every route).
  // `npm run dev` sets NEXT_DIST_DIR=.next explicitly.
  distDir: process.env.NEXT_DIST_DIR ?? ".next-build",
};

export default nextConfig;
