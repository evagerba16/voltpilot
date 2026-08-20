#!/usr/bin/env node

import OpenAI from "openai";

import {
  isOpenAiRulesFallbackError,
  resolveVoltAiAskOpenAiFailure,
  rulesAnswerFallback,
  VOLT_AI_GENERIC_ERROR,
} from "../lib/ai/volt-ai-ask-fallback";

const RULES_ANSWER =
  "Business snapshot: $12,000 pipeline, 18% average gross margin, 42% win rate.";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoApiLeak(result: { answer?: string; error?: string }) {
  const payload = JSON.stringify(result);
  assert(!payload.includes("429"), "response leaked 429 status");
  assert(!payload.toLowerCase().includes("quota"), "response leaked quota details");
  assert(!payload.toLowerCase().includes("openai.com/docs"), "response leaked OpenAI docs URL");
  assert(!payload.toLowerCase().includes("billing details"), "response leaked billing details");
}

assert(
  rulesAnswerFallback(RULES_ANSWER)?.source === "rules",
  "rules fallback preserves rules source"
);

const simulated429 = new OpenAI.RateLimitError(
  429,
  { message: "You exceeded your current quota" },
  "You exceeded your current quota",
  new Headers()
);
assert(isOpenAiRulesFallbackError(simulated429), "429 should trigger fallback classification");

const simulated500 = new OpenAI.InternalServerError(
  500,
  undefined,
  "Internal server error",
  new Headers()
);
assert(isOpenAiRulesFallbackError(simulated500), "5xx should trigger fallback classification");

const simulatedTimeout = new Error("OpenAI answer timed out");
assert(isOpenAiRulesFallbackError(simulatedTimeout), "timeout should trigger fallback classification");

const simulatedQuotaMessage = new Error(
  "429 You exceeded your current quota, please check your plan and billing details."
);
assert(
  isOpenAiRulesFallbackError(simulatedQuotaMessage),
  "quota message should trigger fallback classification"
);

const fallback429 = resolveVoltAiAskOpenAiFailure(RULES_ANSWER);
assert("answer" in fallback429, "429 should return a rules-based answer");
if ("answer" in fallback429) {
  assert(fallback429.answer === RULES_ANSWER, "429 should preserve the rules answer");
  assertNoApiLeak(fallback429);
}

const fallback500 = resolveVoltAiAskOpenAiFailure(RULES_ANSWER);
assert("answer" in fallback500, "5xx should return a rules-based answer");
assertNoApiLeak(fallback500);

const fallbackTimeout = resolveVoltAiAskOpenAiFailure(RULES_ANSWER);
assert("answer" in fallbackTimeout, "timeout should return a rules-based answer");
assertNoApiLeak(fallbackTimeout);

const genericOnly = resolveVoltAiAskOpenAiFailure("");
assert("error" in genericOnly, "empty rules answer should use generic error");
if ("error" in genericOnly) {
  assert(genericOnly.error === VOLT_AI_GENERIC_ERROR, "generic error message should be friendly");
}

console.log("volt-ai ask fallback verification passed");
