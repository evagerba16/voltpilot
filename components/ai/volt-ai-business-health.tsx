"use client";

import type { VoltAiBusinessHealth } from "@/lib/ai/business-advisor";
import { healthStatusEmoji, voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

import { VoltAiCountUp } from "./volt-ai-count-up";

type VoltAiBusinessHealthProps = {
  health: VoltAiBusinessHealth;
};

function HealthBar({ score }: { score: number }) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;

  return (
    <div className="flex items-center gap-2">
      <div
        className="font-mono text-sm tracking-widest text-white/90"
        aria-hidden="true"
      >
        {"█".repeat(filled)}
        {"░".repeat(empty)}
      </div>
      <span className="text-sm font-semibold tabular-nums text-white/80">
        {score}%
      </span>
    </div>
  );
}

function CircularProgress({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative size-28">
      <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#voltAiHealthGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000"
        />
        <defs>
          <linearGradient id="voltAiHealthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-white">
          <VoltAiCountUp value={score} />
        </span>
      </div>
    </div>
  );
}

export function VoltAiBusinessHealthCard({ health }: VoltAiBusinessHealthProps) {
  const statusEmoji = healthStatusEmoji(health.score);

  return (
    <div className="relative flex flex-col gap-5 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-500">
      <div className="flex items-center gap-2 text-sm font-medium text-white/90">
        <span aria-hidden="true">{statusEmoji}</span>
        Business Health
      </div>

      <div className="flex items-center gap-5">
        <CircularProgress score={health.score} />
        <div className="min-w-0 space-y-1">
          <p className="text-2xl font-semibold text-white">{health.rating}</p>
          <HealthBar score={health.score} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-xs text-white/75 lg:grid-cols-4">
        {health.indicators.map((indicator) => (
          <div key={indicator.id} className="flex items-center gap-1.5">
            <span className="font-medium">{indicator.label}</span>
            <span
              className={cn(
                "font-semibold",
                indicator.trend === "up"
                  ? "text-emerald-400"
                  : indicator.trend === "down"
                    ? "text-red-400"
                    : "text-white/50"
              )}
            >
              {indicator.trend === "up" ? "↑" : indicator.trend === "down" ? "↓" : "→"}
            </span>
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-brand/15 blur-2xl"
        )}
      />
    </div>
  );
}
