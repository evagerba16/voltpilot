import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const highlights = [
  "Accurate Project Estimates",
  "Professional Proposal Generation",
  "More Profitable Jobs Won",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute -top-24 right-0 -z-10 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-24 left-0 -z-10 size-72 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Built for Residential &amp; Commercial Electrical Contractors
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Proposal &amp; Estimating Software for Residential &amp; Commercial
            Electrical Contractors
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Create accurate estimates, professional proposals, and win more
            profitable jobs — with AI-assisted workflows built for residential
            and commercial electrical contractors.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/subscribe"
              className={cn(buttonVariants({ size: "lg" }), "gap-2 px-6")}
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-6")}
            >
              Sign In
            </Link>
          </div>

          <ul className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="size-4 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
