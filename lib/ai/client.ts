import OpenAI from "openai";

import { getOpenAIConfig } from "@/lib/ai/env";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  const { apiKey, isConfigured } = getOpenAIConfig();

  if (!isConfigured || !apiKey) {
    return null;
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}
