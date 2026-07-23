#!/usr/bin/env node

/**
 * Verify OpenAI configuration for VoltPilot AI features.
 * Run: npm run ai:verify
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional.
  }
}

loadEnvFile(path.resolve(__dirname, "../.env.local"));
loadEnvFile(path.resolve(__dirname, "../.env"));

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

if (!apiKey) {
  console.error("OPENAI_API_KEY is not set.");
  console.error("");
  console.error("Add to .env.local (server-only — never use NEXT_PUBLIC_ prefix):");
  console.error("  OPENAI_API_KEY=sk-your-key-here");
  console.error("  OPENAI_MODEL=gpt-4o-mini");
  console.error("");
  console.error("Get a key: https://platform.openai.com/api-keys");
  console.error("Restart the dev server after saving .env.local.");
  process.exit(1);
}

if (apiKey.startsWith("sk-your") || apiKey.includes("your-openai")) {
  console.error("OPENAI_API_KEY is still a placeholder. Replace with a real key.");
  process.exit(1);
}

console.log(`Model: ${model}`);
console.log("Testing OpenAI API connectivity...");

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    max_tokens: 8,
    messages: [{ role: "user", content: "Reply with OK only." }],
  }),
});

const body = await response.text();

if (!response.ok) {
  console.error(`OpenAI API error (${response.status}):`, body.slice(0, 400));
  process.exit(1);
}

console.log("OpenAI API: OK");
console.log("");
console.log("Full AI mode enabled for:");
console.log("  - Review Estimate (hybrid rules + OpenAI)");
console.log("  - AI Estimate Assistant (/api/ai/estimate-assistant)");
console.log("  - AI Proposal Assistant (proposal editor)");
