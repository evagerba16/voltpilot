import OpenAI from "openai";

export const VOLT_AI_GENERIC_ERROR =
  "Unable to answer right now. Try again in a moment.";

export type VoltAiAskResponse = {
  answer?: string;
  error?: string;
  source?: "rules" | "openai";
};

export function isOpenAiRulesFallbackError(error: unknown): boolean {
  if (
    error instanceof OpenAI.RateLimitError ||
    error instanceof OpenAI.InternalServerError ||
    error instanceof OpenAI.APIConnectionTimeoutError
  ) {
    return true;
  }

  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    if (status === 429 || (status !== undefined && status >= 500)) {
      return true;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("openai answer timed out")) return true;
    if (message.includes("timeout")) return true;
    if (message.includes("429")) return true;
    if (message.includes("quota")) return true;
    if (message.includes("rate limit")) return true;
  }

  return false;
}

export function rulesAnswerFallback(rulesAnswer: string) {
  const trimmed = rulesAnswer.trim();
  if (!trimmed) {
    return null;
  }

  return { answer: trimmed, source: "rules" as const };
}

export function resolveVoltAiAskOpenAiFailure(
  rulesAnswer: string
): { answer: string; source: "rules" } | { error: string } {
  const fallback = rulesAnswerFallback(rulesAnswer);
  if (fallback) {
    return fallback;
  }

  return { error: VOLT_AI_GENERIC_ERROR };
}
