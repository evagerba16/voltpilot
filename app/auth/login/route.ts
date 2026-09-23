import { type NextRequest } from "next/server";

import { runLoginFlow } from "@/lib/auth/run-login-flow";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return runLoginFlow(request, formData);
}
