import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function NavAuth() {
  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return (
      <>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
        >
          Sign In
        </Link>
        <Link href="/subscribe" className={cn(buttonVariants({ size: "sm" }))}>
          Subscribe
        </Link>
      </>
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return (
        <>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.email}
          </span>
          <form>
            <button
              type="submit"
              formAction={signOut}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sign out
            </button>
          </form>
        </>
      );
    }
  } catch {
    // Fall through to signed-out CTAs.
  }

  return (
    <>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
      >
        Sign In
      </Link>
      <Link href="/subscribe" className={cn(buttonVariants({ size: "sm" }))}>
        Subscribe
      </Link>
    </>
  );
}
