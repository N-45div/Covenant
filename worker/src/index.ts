import {
  enrichPolicyVarianceWithOpenRouter,
  evaluatePolicyVariance,
  type PolicyVarianceInput,
  type PolicyVarianceOutput
} from "./policy-variance";

type JsonValue = any;

type Env = {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  RENDER_POLICY_VARIANCE_URL?: string;
};

type Order = {
  order_id: string;
  patient: {
    id: string;
    name: string;
    dob: string;
    phone: string;
  };
  provider: {
    id: string;
    name: string;
    specialty: string;
    state: string;
  };
  payer: {
    id: string;
    name: string;
    member_id: string;
  };
  treatment: {
    name: string;
    cpt: string;
    icd10: string;
    diagnosis_terms: string;
    urgency: string;
  };
  documents: string[];
};

type EvidenceResult = {
  policy_id: string;
  complete: boolean;
  missing_evidence: boolean;
  route: "missing_evidence" | "complete";
  matched: JsonValue[];
  missing: JsonValue[];
  summary: string;
};

type AuthState = {
  auth_id: string;
  order_id: string;
  status: "pending" | "denied" | "appeal_submitted" | "approved";
  reason: string;
  evidence?: EvidenceResult;
  appeal_summary?: string;
  history: JsonValue[];
};

type PolicyVarianceSource = "render" | "local";

const orders: Record<string, Order> = {
  "ORD-MRI-1001": {
    order_id: "ORD-MRI-1001",
    patient: {
      id: "PAT-2042",
      name: "Maya Rodriguez",
      dob: "1981-04-12",
      phone: "+1-555-0104"
    },
    provider: {
      id: "NPI-SEARCH-NY-ORTHO",
      name: "Orthopedic provider from NPI Registry lookup",
      specialty: "Orthopedics",
      state: "NY"
    },
    payer: {
      id: "PAYER-ACME-MA",
      name: "Acme Medicare Advantage",
      member_id: "ACME-77-2042"
    },
    treatment: {
      name: "Lumbar spine MRI without contrast",
      cpt: "72148",
      icd10: "M54.16",
      diagnosis_terms: "lumbar radiculopathy",
      urgency: "standard"
    },
    documents: ["clinical-note-1001", "referral-letter-1001", "insurance-card-1001"]
  },
  "ORD-XRAY-1002": {
    order_id: "ORD-XRAY-1002",
    patient: {
      id: "PAT-3188",
      name: "Jordan Lee",
      dob: "1992-09-03",
      phone: "+1-555-0112"
    },
    provider: {
      id: "NPI-SEARCH-NY-SPORTS",
      name: "Sports medicine provider from NPI Registry lookup",
      specialty: "Sports Medicine",
      state: "NY"
    },
    payer: {
      id: "PAYER-ACME-MA",
      name: "Acme Medicare Advantage",
      member_id: "ACME-44-3188"
    },
    treatment: {
      name: "Knee X-ray 3 views",
      cpt: "73562",
      icd10: "M25.561",
      diagnosis_terms: "right knee pain",
      urgency: "standard"
    },
    documents: ["clinical-note-1002", "insurance-card-1002"]
  }
};

const documents: Record<string, { document_id: string; type: string; confidence: number; facts: Record<string, JsonValue> }> = {
  "clinical-note-1001": {
    document_id: "clinical-note-1001",
    type: "clinical_note",
    confidence: 0.93,
    facts: {
      diagnosis: "Lumbar radiculopathy",
      duration_weeks: 10,
      neurologic_deficit: true,
      conservative_therapy_attempted: true,
      red_flags: false
    }
  },
  "referral-letter-1001": {
    document_id: "referral-letter-1001",
    type: "referral",
    confidence: 0.89,
    facts: {
      specialist_recommendation: "MRI recommended after persistent symptoms",
      ordering_provider: "Orthopedic provider from NPI Registry lookup"
    }
  },
  "insurance-card-1001": {
    document_id: "insurance-card-1001",
    type: "insurance_card",
    confidence: 0.98,
    facts: {
      payer: "Acme Medicare Advantage",
      member_id: "ACME-77-2042"
    }
  },
  "pt-note-1001": {
    document_id: "pt-note-1001",
    type: "physical_therapy_note",
    confidence: 0.91,
    facts: {
      physical_therapy_weeks: 6,
      home_exercise_program: true,
      symptoms_persisted: true
    }
  },
  "clinical-note-1002": {
    document_id: "clinical-note-1002",
    type: "clinical_note",
    confidence: 0.95,
    facts: {
      diagnosis: "Right knee pain",
      onset_days: 5,
      trauma: false,
      swelling: false
    }
  },
  "insurance-card-1002": {
    document_id: "insurance-card-1002",
    type: "insurance_card",
    confidence: 0.99,
    facts: {
      payer: "Acme Medicare Advantage",
      member_id: "ACME-44-3188"
    }
  }
};

const policy = {
  policy_id: "ACME-MRI-LUMBAR",
  payer_id: "PAYER-ACME-MA",
  cpt: "72148",
  requires_prior_auth: true,
  checklist: [
    {
      id: "diagnosis",
      label: "Lumbar radiculopathy diagnosis is documented",
      fact: "diagnosis",
      expected: "Lumbar radiculopathy"
    },
    {
      id: "duration",
      label: "Symptoms persisted for at least six weeks",
      fact: "duration_weeks",
      minimum: 6
    },
    {
      id: "therapy",
      label: "Six weeks of conservative therapy or PT documented",
      fact: "physical_therapy_weeks",
      minimum: 6
    },
    {
      id: "specialist",
      label: "Ordering specialist recommendation is present",
      fact: "specialist_recommendation",
      present: true
    }
  ]
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const authStates = new Map<string, AuthState>();

function json(payload: JsonValue, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

async function readJson(request: Request): Promise<Record<string, any>> {
  if (!request.body || request.headers.get("content-length") === "0") {
    return {};
  }
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return {};
  }
}

function bodyValue<T = any>(body: Record<string, any>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = body[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return undefined;
}

function bodyString(body: Record<string, any>, ...keys: string[]): string | undefined {
  const value = bodyValue(body, ...keys);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function bodyArray<T = any>(body: Record<string, any>, ...keys: string[]): T[] {
  const value = bodyValue<T[]>(body, ...keys);
  return Array.isArray(value) ? value : [];
}

function orderIdFromBody(body: Record<string, any>, fallback = "ORD-MRI-1001"): string {
  return bodyString(body, "order_id", "orderId") ?? fallback;
}

function authIdFromBody(body: Record<string, any>): string {
  return bodyString(body, "auth_id", "authId") ?? "";
}

function orderFromBody(body: Record<string, any>, fallback = "ORD-MRI-1001"): Order {
  return (body.order as Order | undefined) ?? orders[orderIdFromBody(body, fallback)];
}

function extractDocuments(documentIds: string[]) {
  const extracted = documentIds.map((documentId) => {
    return documents[documentId] ?? {
      document_id: documentId,
      status: "missing",
      confidence: 0,
      facts: {}
    };
  });
  const lowConfidence = extracted.filter((document) => (document.confidence ?? 0) < 0.9);
  return {
    status: "extracted",
    documents: extracted,
    requires_validation: lowConfidence.length > 0,
    validation_reasons: lowConfidence.map((document) => `${document.document_id} confidence ${document.confidence ?? 0}`)
  };
}

function flattenFacts(extraction: ReturnType<typeof extractDocuments>) {
  const facts: Record<string, JsonValue> = {};
  for (const document of extraction.documents) {
    Object.assign(facts, document.facts ?? {});
  }
  return facts;
}

function checkCoverage(order: Order) {
  const requiresPriorAuth = policy.payer_id === order.payer.id && policy.cpt === order.treatment.cpt;
  return {
    payer_id: order.payer.id,
    policy_id: requiresPriorAuth ? policy.policy_id : null,
    requires_prior_auth: requiresPriorAuth,
    route: requiresPriorAuth ? "prior_auth_required" : "no_prior_auth",
    documentation_requirements: requiresPriorAuth ? policy.checklist : []
  };
}

function checkEvidence(facts: Record<string, JsonValue>): EvidenceResult {
  const matched: JsonValue[] = [];
  const missing: JsonValue[] = [];
  for (const item of policy.checklist) {
    const value = facts[item.fact];
    let passed = false;
    if ("expected" in item) {
      passed = value === item.expected;
    } else if ("minimum" in item && typeof item.minimum === "number") {
      passed = typeof value === "number" && value >= item.minimum;
    } else if ("present" in item) {
      passed = value !== undefined && value !== null && value !== "";
    }

    const result = {
      id: item.id,
      label: item.label,
      fact: item.fact,
      value: value ?? null,
      passed
    };
    if (passed) {
      matched.push(result);
    } else {
      missing.push(result);
    }
  }

  return {
    policy_id: policy.policy_id,
    complete: missing.length === 0,
    missing_evidence: missing.length > 0,
    route: missing.length === 0 ? "complete" : "missing_evidence",
    matched,
    missing,
    summary:
      missing.length === 0
        ? "All payer documentation requirements are supported by extracted evidence."
        : `Evidence packet is incomplete. Missing: ${missing.map((item: any) => item.label).join(", ")}.`
  };
}

async function lookupDiagnosis(order: Order) {
  const url = new URL("https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search");
  url.searchParams.set("sf", "code,name");
  url.searchParams.set("df", "code,name");
  url.searchParams.set("terms", order.treatment.diagnosis_terms);
  url.searchParams.set("count", "5");
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    return { source: "NLM Clinical Tables ICD-10-CM", available: false, status: response.status };
  }
  const body = (await response.json()) as any[];
  return {
    source: "NLM Clinical Tables ICD-10-CM",
    available: true,
    query: order.treatment.diagnosis_terms,
    expected_code: order.treatment.icd10,
    total: body[0],
    codes: body[1],
    display: body[3]
  };
}

async function lookupProviders(order: Order) {
  const url = new URL("https://npiregistry.cms.hhs.gov/api/");
  url.searchParams.set("version", "2.1");
  url.searchParams.set("state", order.provider.state);
  url.searchParams.set("taxonomy_description", "Orthopaedic Surgery");
  url.searchParams.set("limit", "3");
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    return { source: "NPPES NPI Registry", available: false, status: response.status };
  }
  const body = (await response.json()) as any;
  return {
    source: "NPPES NPI Registry",
    available: true,
    query: {
      state: order.provider.state,
      taxonomy_description: "Orthopaedic Surgery"
    },
    result_count: body.result_count,
    providers: (body.results ?? []).slice(0, 3).map((provider: any) => ({
      npi: provider.number,
      enumeration_type: provider.enumeration_type,
      basic: provider.basic,
      taxonomies: provider.taxonomies
    }))
  };
}

function authId() {
  return `AUTH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function auditId() {
  return `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function appointmentId() {
  return `APT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function submitPriorAuth(order: Order, evidence: EvidenceResult) {
  const id = authId();
  const state: AuthState = {
    auth_id: id,
    order_id: order.order_id,
    status: "pending",
    reason: "Initial review pending.",
    evidence,
    history: [
      {
        status: "pending",
        reason: "Initial review pending."
      }
    ]
  };
  authStates.set(id, state);
  return {
    auth_id: id,
    status: state.status,
    reason: state.reason,
    submitted_at: new Date().toISOString()
  };
}

function getPriorAuthStatus(id: string) {
  const state = authStates.get(id);
  if (!state) {
    return {
      auth_id: id,
      status: "denied",
      reason: "Payer requires explicit physical therapy duration and persistence after therapy.",
      decided_at: new Date().toISOString(),
      simulated: true,
      note: "No in-memory auth state found. Returning deterministic denial for demo continuity."
    };
  }

  if (state.status === "appeal_submitted") {
    state.status = "approved";
    state.reason = "Appeal accepted after physician attestation and PT documentation review.";
    state.history.push({
      status: "approved",
      reason: state.reason,
      authorization_expires: "2026-09-30"
    });
    return {
      auth_id: id,
      status: "approved",
      route: "approved",
      reason: state.reason,
      authorization_expires: "2026-09-30",
      decided_at: new Date().toISOString()
    };
  }

  if (state.status === "approved") {
    return {
      auth_id: id,
      status: "approved",
      route: "approved",
      reason: state.reason,
      authorization_expires: "2026-09-30",
      decided_at: new Date().toISOString()
    };
  }

  state.status = "denied";
  state.reason = "Payer requires explicit physical therapy duration and persistence after therapy.";
  state.history.push({
    status: "denied",
    reason: state.reason
  });
  return {
    auth_id: id,
    status: "denied",
    route: "denied",
    reason: state.reason,
    decided_at: new Date().toISOString()
  };
}

function buildAppealPacket(authId: string, physicianNote = "Patient completed six weeks of PT with persistent radicular symptoms.") {
  const state = authStates.get(authId);
  const denialReason =
    state?.reason ?? "Payer requires explicit physical therapy duration and persistence after therapy.";
  return {
    auth_id: authId,
    denial_reason: denialReason,
    appeal_summary:
      "Appeal packet cites six weeks of physical therapy, persistent radicular symptoms, specialist recommendation, and physician attestation.",
    physician_note: physicianNote,
    requires_physician_approval: true,
    generated_at: new Date().toISOString()
  };
}

function submitAppeal(authId: string, appealPacket: JsonValue, approvedBy: string) {
  const state = authStates.get(authId);
  if (state) {
    state.status = "appeal_submitted";
    state.appeal_summary = appealPacket?.appeal_summary ?? "Appeal submitted after physician approval.";
    state.history.push({
      status: "appeal_submitted",
      approved_by: approvedBy,
      appeal_summary: state.appeal_summary
    });
  }
  return {
    auth_id: authId,
    status: "appeal_submitted",
    approved_by: approvedBy,
    submitted_at: new Date().toISOString()
  };
}

function uploadMissingDocument(order: Order, documentId = "pt-note-1001") {
  const documents = Array.from(new Set([...order.documents, documentId]));
  return {
    order_id: order.order_id,
    uploaded_document_id: documentId,
    documents,
    uploaded_by: "Clinic coordinator",
    uploaded_at: new Date().toISOString()
  };
}

function approvePriorAuthPacket(order: Order, evidence: JsonValue, approvedBy = "Licensed clinician") {
  return {
    order_id: order.order_id,
    approved: true,
    approved_by: approvedBy,
    approval_type: "prior_authorization_submission",
    evidence_complete: evidence?.complete ?? true,
    approved_at: new Date().toISOString()
  };
}

function approveAppeal(authId: string, appealPacket: JsonValue, approvedBy = "Physician") {
  return {
    auth_id: authId,
    approved: true,
    approved_by: approvedBy,
    approval_type: "denial_rescue_appeal",
    appeal_summary: appealPacket?.appeal_summary ?? "Appeal packet approved.",
    approved_at: new Date().toISOString()
  };
}

function scheduleTreatment(order: Order, authId: string) {
  return {
    appointment_id: appointmentId(),
    order_id: order.order_id,
    auth_id: authId,
    scheduled_at: "2026-07-08T09:30:00-04:00",
    site: "Northside Imaging Center"
  };
}

function notifyPatient(order: Order, appointment: JsonValue) {
  const appointmentDetails =
    appointment ?? {
      scheduled_at: "2026-07-08T09:30:00-04:00",
      site: "Northside Imaging Center"
    };
  return {
    patient_id: order.patient.id,
    channel: "sms",
    recipient: order.patient.phone,
    message: `Your ${order.treatment.name} is approved and scheduled for ${appointmentDetails.scheduled_at} at ${appointmentDetails.site}.`,
    sent: true,
    sent_at: new Date().toISOString()
  };
}

function createAuditPacket(order: Order, authId: string, appointment: JsonValue) {
  const state = authStates.get(authId);
  const appointmentDetails =
    appointment ?? {
      appointment_id: "APT-DEMO",
      scheduled_at: "2026-07-08T09:30:00-04:00",
      site: "Northside Imaging Center"
    };
  return {
    packet_id: auditId(),
    order_id: order.order_id,
    auth_id: authId,
    appointment_id: appointmentDetails.appointment_id,
    appointment: appointmentDetails,
    live_public_sources_used: ["NLM Clinical Tables ICD-10-CM", "NPPES NPI Registry"],
    simulated_components: ["patient record", "payer prior authorization decision", "scheduling", "patient notification"],
    payer_history: state?.history ?? [],
    generated_at: new Date().toISOString()
  };
}

function openRouterOptions(env?: Env) {
  return {
    apiKey: env?.OPENROUTER_API_KEY,
    model: env?.OPENROUTER_MODEL,
    enabled: Boolean(env?.OPENROUTER_API_KEY)
  };
}

async function fetchPolicyVarianceFromRender(
  input: PolicyVarianceInput,
  env?: Env
): Promise<{ source: PolicyVarianceSource; result: PolicyVarianceOutput }> {
  const renderUrl = env?.RENDER_POLICY_VARIANCE_URL?.trim();
  if (!renderUrl) {
    const local = evaluatePolicyVariance(input);
    return {
      source: "local",
      result: await enrichPolicyVarianceWithOpenRouter(input, local, openRouterOptions(env))
    };
  }

  try {
    const response = await fetch(renderUrl.replace(/\/$/, "") + "/external-agents/policy-variance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Render policy agent returned HTTP ${response.status}`);
    }

    const result = (await response.json()) as PolicyVarianceOutput;
    return { source: "render", result };
  } catch {
    const local = evaluatePolicyVariance(input);
    return {
      source: "local",
      result: await enrichPolicyVarianceWithOpenRouter(input, local, openRouterOptions(env))
    };
  }
}

async function runDemo(env?: Env) {
  const order = structuredClone(orders["ORD-MRI-1001"]);
  const liveDiagnosis = await lookupDiagnosis(order);
  const liveProviders = await lookupProviders(order);

  const steps: JsonValue[] = [
    { step: "doctor_order_received", actor: "EHR API", output: order },
    { step: "public_diagnosis_validated", actor: "NLM Clinical Tables API", output: liveDiagnosis },
    { step: "provider_reference_checked", actor: "NPPES NPI Registry API", output: liveProviders }
  ];

  const coverage = checkCoverage(order);
  steps.push({ step: "coverage_checked", actor: "Payer API Workflow", output: coverage });

  let extraction = extractDocuments(order.documents);
  steps.push({ step: "documents_extracted", actor: "IXP / Document Understanding", output: extraction });

  let evidence = checkEvidence(flattenFacts(extraction));
  steps.push({ step: "evidence_checked", actor: "Evidence Agent", output: evidence });

  let policyVarianceRun = await fetchPolicyVarianceFromRender(
    {
      order_id: order.order_id,
      coverage,
      evidence,
      payer_decision: {}
    },
    env
  );
  let policyVariance = policyVarianceRun.result;
  steps.push({
    step: "policy_variance_checked",
    actor:
      policyVarianceRun.source === "render"
        ? "Mastra external policy agent on Render via UiPath API Workflow"
        : "Local policy variance fallback via UiPath API Workflow",
    output: policyVariance
  });

  if (!evidence.complete) {
    order.documents.push("pt-note-1001");
    steps.push({
      step: "missing_document_uploaded",
      actor: "Clinic Coordinator User Task",
      output: { uploaded_document_id: "pt-note-1001" }
    });
    extraction = extractDocuments(order.documents);
    evidence = checkEvidence(flattenFacts(extraction));
    steps.push({ step: "evidence_rechecked", actor: "Evidence Agent", output: evidence });
    policyVarianceRun = await fetchPolicyVarianceFromRender(
      {
        order_id: order.order_id,
        coverage,
        evidence,
        payer_decision: {}
      },
      env
    );
    policyVariance = policyVarianceRun.result;
    steps.push({
      step: "policy_variance_rechecked",
      actor:
        policyVarianceRun.source === "render"
          ? "Mastra external policy agent on Render via UiPath API Workflow"
          : "Local policy variance fallback via UiPath API Workflow",
      output: policyVariance
    });
  }

  const submission = submitPriorAuth(order, evidence);
  const id = submission.auth_id;
  steps.push({ step: "submission_approved", actor: "Clinician User Task", output: { approved_by: "Licensed clinician" } });
  steps.push({ step: "prior_auth_submitted", actor: "Payer API Workflow", output: submission });
  const deniedDecision = getPriorAuthStatus(id);
  steps.push({
    step: "payer_decision_received",
    actor: "Timer + Payer Status API",
    output: deniedDecision
  });
  const denialVarianceRun = await fetchPolicyVarianceFromRender(
    {
      order_id: order.order_id,
      coverage,
      evidence,
      payer_decision: deniedDecision
    },
    env
  );
  const denialVariance = denialVarianceRun.result;
  steps.push({
    step: "denial_variance_checked",
    actor:
      denialVarianceRun.source === "render"
        ? "Mastra external policy agent on Render via UiPath API Workflow"
        : "Local policy variance fallback via UiPath API Workflow",
    output: denialVariance
  });
  const appealPacket = buildAppealPacket(id);
  steps.push({
    step: "denial_rescue_packet_built",
    actor: "Denial Rescue Agent",
    output: appealPacket
  });
  steps.push({ step: "appeal_approved", actor: "Physician User Task", output: { approved_by: "Physician" } });
  steps.push({
    step: "appeal_submitted",
    actor: "Payer API Workflow",
    output: submitAppeal(id, appealPacket, "Physician")
  });
  const approvedDecision = getPriorAuthStatus(id);
  steps.push({
    step: "appeal_decision_received",
    actor: "Timer + Payer Status API",
    output: approvedDecision
  });

  const appointment = scheduleTreatment(order, id);
  const audit = createAuditPacket(order, id, appointment);
  steps.push({ step: "treatment_scheduled", actor: "Scheduling API Workflow", output: appointment });
  steps.push({ step: "patient_notified", actor: "Patient Update Agent", output: notifyPatient(order, appointment) });
  steps.push({ step: "audit_packet_created", actor: "Audit Service Task", output: audit });

  return {
    process: "Covenant Treatment Clearance",
    status: "completed",
    live_public_sources_used: ["NLM Clinical Tables ICD-10-CM", "NPPES NPI Registry"],
    simulated_components: ["patient record", "payer prior authorization decision", "scheduling", "patient notification"],
    steps,
    final: {
      order_id: order.order_id,
      auth_id: id,
      payer_status: "approved",
      appointment_id: appointment.appointment_id,
      audit_packet_id: audit.packet_id
    }
  };
}

export default {
  async fetch(request: Request, env?: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "GET" && path === "/health") {
        return json({
          status: "ok",
          service: "covenant",
          runtime: "cloudflare-workers",
          external_agents: ["MastraPolicyVarianceAgentOnRender", "LocalPolicyVarianceFallback"],
          llm_provider: "OpenRouter",
          llm_configured: Boolean(env?.OPENROUTER_API_KEY),
          render_policy_agent_configured: Boolean(env?.RENDER_POLICY_VARIANCE_URL)
        });
      }

      if (request.method === "GET" && path.startsWith("/ehr/orders/")) {
        const orderId = path.split("/").pop() ?? "";
        const order = orders[orderId];
        return order ? json(order) : json({ error: "not_found", order_id: orderId }, 404);
      }

      if (request.method === "GET" && path === "/public/diagnosis") {
        const order = orders[url.searchParams.get("orderId") ?? "ORD-MRI-1001"];
        return order ? json(await lookupDiagnosis(order)) : json({ error: "order_not_found" }, 404);
      }

      if (request.method === "GET" && path === "/public/providers") {
        const order = orders[url.searchParams.get("orderId") ?? "ORD-MRI-1001"];
        return order ? json(await lookupProviders(order)) : json({ error: "order_not_found" }, 404);
      }

      if (request.method === "POST" && path === "/documents/extract") {
        const body = await readJson(request);
        return json(extractDocuments(bodyArray<string>(body, "document_ids", "documentIds")));
      }

      if (request.method === "POST" && path === "/payer/coverage") {
        const body = await readJson(request);
        const order = orderFromBody(body);
        return json(checkCoverage(order));
      }

      if (request.method === "POST" && path === "/evidence/check") {
        const body = await readJson(request);
        return json(checkEvidence(body.facts ?? {}));
      }

      if (request.method === "POST" && path === "/external-agents/policy-variance") {
        const body = await readJson(request);
        const policyVarianceRun = await fetchPolicyVarianceFromRender(body as PolicyVarianceInput, env);
        return json({
          ...policyVarianceRun.result,
          source: policyVarianceRun.source
        });
      }

      if (request.method === "POST" && path === "/payer/prior-auth") {
        const body = await readJson(request);
        const order = orderFromBody(body);
        const evidence = body.evidence ?? checkEvidence(body.facts ?? {});
        return json(submitPriorAuth(order, evidence));
      }

      if (request.method === "GET" && path.startsWith("/payer/prior-auth/")) {
        const authId = path.split("/").pop() ?? "";
        return json(getPriorAuthStatus(authId));
      }

      if (request.method === "POST" && path === "/appeals/build") {
        const body = await readJson(request);
        return json(buildAppealPacket(authIdFromBody(body), bodyString(body, "physician_note", "physicianNote")));
      }

      if (request.method === "POST" && path === "/human/upload-missing-document") {
        const body = await readJson(request);
        const order = orderFromBody(body);
        return json(uploadMissingDocument(order, bodyString(body, "document_id", "documentId")));
      }

      if (request.method === "POST" && path === "/human/approve-packet") {
        const body = await readJson(request);
        const order = orderFromBody(body);
        return json(approvePriorAuthPacket(order, body.evidence, bodyString(body, "approved_by", "approvedBy")));
      }

      if (request.method === "POST" && path === "/human/approve-appeal") {
        const body = await readJson(request);
        return json(
          approveAppeal(authIdFromBody(body), body.appeal_packet ?? body.appealPacket, bodyString(body, "approved_by", "approvedBy"))
        );
      }

      if (request.method === "POST" && path.startsWith("/payer/prior-auth/") && path.endsWith("/appeal")) {
        const parts = path.split("/");
        const authId = parts[parts.length - 2];
        const body = await readJson(request);
        return json(submitAppeal(authId, body.appeal_packet ?? body.appealPacket, bodyString(body, "approved_by", "approvedBy") ?? "Physician"));
      }

      if (request.method === "POST" && path === "/schedule") {
        const body = await readJson(request);
        const order = orderFromBody(body);
        return json(scheduleTreatment(order, authIdFromBody(body)));
      }

      if (request.method === "POST" && path === "/notify") {
        const body = await readJson(request);
        const order = orderFromBody(body);
        return json(notifyPatient(order, body.appointment));
      }

      if (request.method === "POST" && path === "/audit/packet") {
        const body = await readJson(request);
        const order = orderFromBody(body);
        return json(createAuditPacket(order, authIdFromBody(body), body.appointment));
      }

      if (request.method === "POST" && path === "/demo/run") {
        return json(await runDemo(env));
      }

      return json({ error: "not_found", path }, 404);
    } catch (error) {
      return json({ error: "internal_error", detail: error instanceof Error ? error.message : String(error) }, 500);
    }
  }
};
