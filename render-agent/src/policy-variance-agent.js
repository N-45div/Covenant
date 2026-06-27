import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const policyRequirementSchema = z.object({
  id: z.string(),
  label: z.string(),
  fact: z.string().optional(),
  expected: z.string().optional(),
  minimum: z.number().optional(),
  present: z.boolean().optional()
});

const evidenceItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  fact: z.string().optional(),
  value: z.any().optional(),
  passed: z.boolean().optional()
});

export const policyVarianceInputSchema = z.object({
  order_id: z.string().default("ORD-MRI-1001"),
  coverage: z
    .object({
      policy_id: z.string().optional(),
      requires_prior_auth: z.boolean().optional(),
      route: z.string().optional(),
      documentation_requirements: z.array(policyRequirementSchema).optional()
    })
    .passthrough()
    .default({}),
  evidence: z
    .object({
      complete: z.boolean().optional(),
      route: z.string().optional(),
      matched: z.array(evidenceItemSchema).optional(),
      missing: z.array(evidenceItemSchema).optional(),
      summary: z.string().optional()
    })
    .passthrough()
    .default({}),
  payer_decision: z
    .object({
      status: z.string().optional(),
      route: z.string().optional(),
      reason: z.string().optional()
    })
    .passthrough()
    .default({})
});

const normalizedPolicyInputSchema = policyVarianceInputSchema.extend({
  matchedLabels: z.array(z.string()),
  missingLabels: z.array(z.string()),
  hasPriorAuth: z.boolean(),
  hasDenial: z.boolean()
});

export const policyVarianceOutputSchema = z.object({
  agent: z.literal("MastraPolicyVarianceAgent"),
  framework: z.literal("Mastra"),
  llm_provider: z.literal("OpenRouter").optional(),
  llm_model: z.string().optional(),
  llm_status: z.enum(["not_configured", "succeeded", "failed"]).optional(),
  llm_explanation: z.string().optional(),
  llm_error: z.string().optional(),
  route: z.enum(["missing_evidence", "clinician_review", "denial_rescue", "ready_for_submission"]),
  risk_level: z.enum(["low", "medium", "high"]),
  policy_gaps: z.array(z.string()),
  next_best_action: z.string(),
  human_review_required: z.boolean(),
  audit_note: z.string(),
  trace: z.array(
    z.object({
      step: z.string(),
      decision: z.string()
    })
  )
});

const normalizePolicyPacket = createStep({
  id: "normalize-policy-packet",
  inputSchema: policyVarianceInputSchema,
  outputSchema: normalizedPolicyInputSchema,
  execute: async ({ inputData }) => {
    const matchedLabels = (inputData.evidence.matched ?? []).map((item) => item.label ?? item.id ?? "matched evidence");
    const missingLabels = (inputData.evidence.missing ?? []).map((item) => item.label ?? item.id ?? "missing evidence");
    const hasPriorAuth =
      inputData.coverage.requires_prior_auth === true || inputData.coverage.route === "prior_auth_required";
    const payerStatus = inputData.payer_decision.status ?? inputData.payer_decision.route ?? "";
    const hasDenial = payerStatus === "denied";

    return {
      ...inputData,
      matchedLabels,
      missingLabels,
      hasPriorAuth,
      hasDenial
    };
  }
});

const assessPolicyVariance = createStep({
  id: "assess-policy-variance",
  inputSchema: normalizedPolicyInputSchema,
  outputSchema: policyVarianceOutputSchema,
  execute: async ({ inputData }) => {
    const policyGaps = [...inputData.missingLabels];
    const trace = [
      {
        step: "coverage",
        decision: inputData.hasPriorAuth ? "prior authorization required" : "prior authorization not required"
      },
      {
        step: "evidence",
        decision: policyGaps.length > 0 ? `${policyGaps.length} documentation gap(s) found` : "payer evidence checklist complete"
      }
    ];

    if (inputData.hasDenial) {
      return {
        agent: "MastraPolicyVarianceAgent",
        framework: "Mastra",
        route: "denial_rescue",
        risk_level: "high",
        policy_gaps: policyGaps.length > 0 ? policyGaps : [inputData.payer_decision.reason ?? "Payer denial requires appeal review"],
        next_best_action: "Build denial rescue packet and route to physician approval before appeal submission.",
        human_review_required: true,
        audit_note:
          "Mastra policy variance workflow detected a payer denial and routed the case to denial rescue with mandatory physician review.",
        trace: [
          ...trace,
          {
            step: "payer_decision",
            decision: inputData.payer_decision.reason ?? "denied"
          }
        ]
      };
    }

    if (policyGaps.length > 0) {
      return {
        agent: "MastraPolicyVarianceAgent",
        framework: "Mastra",
        route: "missing_evidence",
        risk_level: "high",
        policy_gaps: policyGaps,
        next_best_action: "Route to clinic coordinator to upload missing payer-required evidence, then rerun evidence review.",
        human_review_required: true,
        audit_note:
          "Mastra policy variance workflow found a payer-policy evidence gap before submission, preventing a likely denial.",
        trace
      };
    }

    if (inputData.hasPriorAuth) {
      return {
        agent: "MastraPolicyVarianceAgent",
        framework: "Mastra",
        route: "clinician_review",
        risk_level: "medium",
        policy_gaps: [],
        next_best_action: "Route completed packet to clinician approval before payer submission.",
        human_review_required: true,
        audit_note:
          "Mastra policy variance workflow found no open payer checklist gaps, but prior authorization still requires clinician review.",
        trace
      };
    }

    return {
      agent: "MastraPolicyVarianceAgent",
      framework: "Mastra",
      route: "ready_for_submission",
      risk_level: "low",
      policy_gaps: [],
      next_best_action: "No prior authorization needed; schedule care and notify patient.",
      human_review_required: false,
      audit_note:
        "Mastra policy variance workflow found no prior authorization requirement and no policy variance requiring human escalation.",
      trace
    };
  }
});

export const policyVarianceWorkflow = createWorkflow({
  id: "covenant-policy-variance-agent",
  inputSchema: policyVarianceInputSchema,
  outputSchema: policyVarianceOutputSchema
})
  .then(normalizePolicyPacket)
  .then(assessPolicyVariance)
  .commit();

async function enrichWithOpenRouter(input, result, options) {
  const model = options.model ?? "openai/gpt-4o-mini";
  if (!options.enabled || !options.apiKey) {
    return {
      ...result,
      llm_provider: "OpenRouter",
      llm_model: model,
      llm_status: "not_configured"
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://covenant-treatment-clearance.ndivij2004.workers.dev",
        "X-Title": "Covenant Treatment Clearance"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are an administrative policy variance reviewer for a UiPath-orchestrated treatment clearance workflow. Do not provide medical advice, do not decide medical necessity, and do not override human review. Explain the workflow routing decision in concise staff-facing language."
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                order_id: input.order_id,
                deterministic_agent_result: result,
                coverage: input.coverage,
                evidence: input.evidence,
                payer_decision: input.payer_decision
              },
              null,
              2
            )
          }
        ]
      })
    });

    if (!response.ok) {
      return {
        ...result,
        llm_provider: "OpenRouter",
        llm_model: model,
        llm_status: "failed",
        llm_error: `OpenRouter returned HTTP ${response.status}`
      };
    }

    const payload = await response.json();
    const explanation = payload?.choices?.[0]?.message?.content;
    return {
      ...result,
      llm_provider: "OpenRouter",
      llm_model: model,
      llm_status: "succeeded",
      llm_explanation:
        typeof explanation === "string" && explanation.trim()
          ? explanation.trim()
          : "OpenRouter completed without a staff-facing explanation."
    };
  } catch (error) {
    return {
      ...result,
      llm_provider: "OpenRouter",
      llm_model: model,
      llm_status: "failed",
      llm_error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function runPolicyVarianceAgent(input, options = {}) {
  const parsedInput = policyVarianceInputSchema.parse(input);
  const run = await policyVarianceWorkflow.createRun();
  const result = await run.start({
    inputData: parsedInput
  });

  if (result.status !== "success") {
    throw new Error(`Mastra policy variance workflow failed with status ${result.status}`);
  }

  return enrichWithOpenRouter(parsedInput, result.result, options);
}
