type JsonValue = any;

export type PolicyVarianceInput = {
  order_id?: string;
  orderId?: string;
  coverage?: {
    route?: string;
    requires_prior_auth?: boolean;
    requiresPriorAuth?: boolean;
  };
  evidence?: {
    route?: string;
    complete?: boolean;
    missing?: JsonValue[];
    missingLabels?: string[];
    missing_evidence?: boolean;
    missingEvidence?: boolean;
  };
  payer_decision?: {
    status?: string;
    route?: string;
    reason?: string;
  };
  payerDecision?: {
    status?: string;
    route?: string;
    reason?: string;
  };
};

export type PolicyVarianceOutput = {
  agent: string;
  framework: string;
  route: "missing_evidence" | "clinician_review" | "denial_rescue" | "ready_for_submission";
  risk_level: "low" | "medium" | "high";
  policy_gaps: string[];
  next_best_action: string;
  human_review_required: boolean;
  audit_note: string;
  trace: Array<{
    step: string;
    decision: string;
  }>;
  llm_provider?: "OpenRouter";
  llm_model?: string;
  llm_status?: "not_configured" | "succeeded" | "failed";
  llm_explanation?: string;
  llm_error?: string;
};

function normalizeInput(input: PolicyVarianceInput): PolicyVarianceInput {
  return {
    order_id: input.order_id ?? input.orderId,
    coverage: input.coverage
      ? {
          ...input.coverage,
          requires_prior_auth: input.coverage.requires_prior_auth ?? input.coverage.requiresPriorAuth
        }
      : undefined,
    evidence: input.evidence
      ? {
          ...input.evidence,
          missing_evidence: input.evidence.missing_evidence ?? input.evidence.missingEvidence
        }
      : undefined,
    payer_decision: input.payer_decision ?? input.payerDecision
  };
}

function normalizeGaps(input: PolicyVarianceInput) {
  const missingLabels = input.evidence?.missingLabels ?? [];
  const missingEvidence = input.evidence?.missing ?? [];
  const gaps = [
    ...missingLabels,
    ...missingEvidence
      .map((item) => item?.label ?? item?.id ?? "")
      .filter((label): label is string => Boolean(label))
  ];
  return Array.from(new Set(gaps));
}

export function evaluatePolicyVariance(input: PolicyVarianceInput): PolicyVarianceOutput {
  const normalized = normalizeInput(input);
  const hasPriorAuth =
    normalized.coverage?.requires_prior_auth === true || normalized.coverage?.route === "prior_auth_required";
  const payerStatus = normalized.payer_decision?.status ?? normalized.payer_decision?.route ?? "";
  const hasDenial = payerStatus === "denied";
  const policyGaps = normalizeGaps(normalized);
  const trace = [
    {
      step: "coverage",
      decision: hasPriorAuth ? "prior authorization required" : "prior authorization not required"
    },
    {
      step: "evidence",
      decision: policyGaps.length > 0 ? `${policyGaps.length} documentation gap(s) found` : "payer evidence checklist complete"
    }
  ];

  if (hasDenial) {
    return {
      agent: "MastraPolicyVarianceAgent",
      framework: "Mastra",
      route: "denial_rescue",
      risk_level: "high",
      policy_gaps:
        policyGaps.length > 0 ? policyGaps : [normalized.payer_decision?.reason ?? "Payer denial requires appeal review"],
      next_best_action: "Build denial rescue packet and route to physician approval before appeal submission.",
      human_review_required: true,
      audit_note:
        "Policy variance workflow detected a payer denial and routed the case to denial rescue with mandatory physician review.",
      trace: [
        ...trace,
        {
          step: "payer_decision",
          decision: normalized.payer_decision?.reason ?? "denied"
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
        "Policy variance workflow found a payer-policy evidence gap before submission, preventing a likely denial.",
      trace
    };
  }

  if (hasPriorAuth) {
    return {
      agent: "MastraPolicyVarianceAgent",
      framework: "Mastra",
      route: "clinician_review",
      risk_level: "medium",
      policy_gaps: [],
      next_best_action: "Route completed packet to clinician approval before payer submission.",
      human_review_required: true,
      audit_note:
        "Policy variance workflow found no open payer checklist gaps, but prior authorization still requires clinician review.",
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
      "Policy variance workflow found no prior authorization requirement and no policy variance requiring human escalation.",
    trace
  };
}

type OpenRouterOptions = {
  apiKey?: string;
  model?: string;
  enabled?: boolean;
};

export async function enrichPolicyVarianceWithOpenRouter(
  input: PolicyVarianceInput,
  result: PolicyVarianceOutput,
  options: OpenRouterOptions = {}
): Promise<PolicyVarianceOutput> {
  const normalized = normalizeInput(input);
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
                order_id: normalized.order_id,
                deterministic_agent_result: result,
                coverage: normalized.coverage,
                evidence: normalized.evidence,
                payer_decision: normalized.payer_decision
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

    const payload = (await response.json()) as any;
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
