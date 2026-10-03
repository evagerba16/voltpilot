import Link from "next/link";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { getSiteContactEmail, getSiteContactMailto } from "@/lib/site/contact";
import { cn } from "@/lib/utils";

export function Contact() {
  const email = getSiteContactEmail();
  const mailto = getSiteContactMailto();

  return (
    <section id="contact" className="border-t border-border/60 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">
            Contact us
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Questions about VoltPilot?
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Whether you&apos;re evaluating VoltPilot for your electrical contracting
            business or need help with your account, we&apos;re here.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="size-4" />
            </span>
            <h3 className="mt-3 text-lg font-semibold">Email our team</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Need help? Tell us how we can help.
            </p>
            <Link
              href={mailto}
              className="mt-3 inline-flex items-center gap-2 text-base font-medium text-primary hover:underline"
            >
              <Mail className="size-4" />
              {email}
            </Link>
            <Link
              href={mailto}
              className={cn(buttonVariants({ size: "lg" }), "mt-4 gap-2 rounded-full px-6")}
            >
              Send a message
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
