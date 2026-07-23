import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function AuthStatus() {
  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return (
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Sign in
      </Link>
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return (
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Sign in
        </Link>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <form>
          <button
            type="submit"
            formAction={signOut}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Sign out
          </button>
        </form>
      </div>
    );
  } catch {
    return (
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Sign in
      </Link>
    );
  }
}
