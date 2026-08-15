/** Enable the unified Estimate Copilot panel (Phase 2 Sprint 2A). */
export function isEstimateCopilotEnabled() {
  return process.env.NEXT_PUBLIC_ESTIMATE_COPILOT === "1";
}
