const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function getMissingRequiredEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());
}

export function validateRequiredEnv(options?: { strict?: boolean }) {
  const missing = getMissingRequiredEnvVars();
  if (missing.length === 0) {
    return;
  }

  const message = `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env.local and set Supabase credentials.`;
  const strict = options?.strict ?? process.env.NODE_ENV === "production";

  if (strict) {
    throw new Error(message);
  }

  console.warn(`[VoltPilot] ${message}`);
}
