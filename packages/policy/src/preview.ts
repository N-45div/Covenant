import { getPolicyTemplate } from "./templates.js";
import type { PolicyPreview, PolicyTemplateId } from "./types.js";

export function previewPolicy(id: PolicyTemplateId): PolicyPreview {
  const template = getPolicyTemplate(id);

  if (!template) {
    throw new Error(`Unknown policy template: ${id}`);
  }

  const warnings: string[] = [];
  let score = 100;

  if (template.approvalMode === "auto") {
    score -= 8;
  }

  if (template.maxSlippageBps > 100) {
    score -= 12;
    warnings.push("Slippage limit is wider than conservative defaults.");
  }

  if (template.cooldownSeconds < 900) {
    score -= 10;
    warnings.push("Cooldown is short enough for rapid repeated actions.");
  }

  if (template.assets.length > 2) {
    score -= 8;
    warnings.push("Policy covers several assets; review allowed list carefully.");
  }

  if (template.approvalMode === "human") {
    warnings.push("Human approval is required before threshold-crossing actions.");
  }

  return {
    template,
    safetyScore: Math.max(score, 0),
    warnings
  };
}

