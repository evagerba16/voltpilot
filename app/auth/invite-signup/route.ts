import { type NextRequest } from "next/server";

import { runInviteSignupFlow } from "@/lib/teams/run-invite-signup-flow";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return runInviteSignupFlow(request, formData);
}
