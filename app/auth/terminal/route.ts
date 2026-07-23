import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error")?.trim();
  const supabase = await createClient();

  await supabase.auth.signOut();

  const loginUrl = new URL("/login", url.origin);

  if (error) {
    loginUrl.searchParams.set("error", error);
  }

  return NextResponse.redirect(loginUrl);
}
