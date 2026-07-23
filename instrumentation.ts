import { validateRequiredEnv } from "@/lib/env/validate";

export async function register() {
  validateRequiredEnv();
}
