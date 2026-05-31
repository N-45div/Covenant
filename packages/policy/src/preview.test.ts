import { describe, expect, it } from "vitest";
import { previewPolicy } from "./preview.js";

describe("policy preview", () => {
  it("scores conservative template higher than high risk template", () => {
    const conservative = previewPolicy("conservative-investor");
    const highRisk = previewPolicy("high-risk-with-approval");

    expect(conservative.safetyScore).toBeGreaterThan(highRisk.safetyScore);
    expect(highRisk.warnings.length).toBeGreaterThan(0);
  });

  it("keeps agent sandbox human-gated", () => {
    const sandbox = previewPolicy("agent-sandbox");

    expect(sandbox.template.approvalMode).toBe("human");
    expect(sandbox.warnings).toContain(
      "Human approval is required before threshold-crossing actions."
    );
  });
});

