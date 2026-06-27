# Covenant

## Treatment Clearance & Denial Rescue Orchestrator

Because treatment should not wait in paperwork.

Covenant is a Track 2 UiPath Maestro BPMN solution for treatment clearance in healthcare. It orchestrates eligibility checks, evidence gathering, prior authorization, denial rescue, scheduling, patient communication, and audit generation through a governed end-to-end process. UiPath remains the control plane. External services and agents are used only as orchestrated participants.

## Business Problem

When a doctor orders an MRI, infusion, procedure, or specialist treatment, care often stalls before it reaches the patient. The order enters an administrative queue shaped by payer eligibility checks, prior authorization requirements, missing documentation, denial handling, staff review, and scheduling dependencies.

The operational problem is not that one step is slow. The problem is that the workflow breaks across systems, ownership boundaries, and exception paths. Orders become open loops. Staff spend time chasing documents, re-keying evidence, checking status manually, and reacting to denials too late.

Covenant addresses that gap with a BPMN-first orchestration layer that keeps the order moving until it reaches one of two governed outcomes:

- treatment is scheduled, communicated, and audited
- denial rescue is prepared, reviewed, appealed, and tracked

## Product Value

Covenant improves the operating model around treatment clearance, not just one task inside it.

- `Fewer open loops`: every order remains inside a visible workflow until it reaches a governed outcome.
- `Less manual chasing`: evidence, status checks, routing, and packet preparation move through one orchestrated process.
- `Better exception handling`: missing evidence and denials are treated as first-class branches, not side work.
- `Safer approvals`: high-impact transitions stay under human control.
- `Clearer accountability`: the process has explicit ownership, state, and traceability across systems.

## What The Solution Does

Covenant models a predictable treatment-clearance process in UiPath Maestro BPMN and supports it with API workflows, document extraction, governed approval steps, and agentic policy analysis.

Core flow:

1. receive the treatment order
2. check payer coverage and determine whether prior authorization is required
3. extract clinical and administrative evidence
4. evaluate completeness against payer requirements
5. route missing evidence to upload and retry
6. route complete packets to staff approval
7. submit prior authorization
8. monitor payer decision
9. if denied, build denial rescue and appeal
10. if approved, schedule treatment
11. notify the patient
12. generate an audit packet

## Why This Fits Track 2

Track 2 asks for a BPMN 2.0 process that orchestrates humans, APIs, agents, and decisions through a defined end-to-end flow. Covenant is built around that exact structure:

- BPMN process orchestration in UiPath Maestro
- API workflows for payer, scheduling, notification, and audit steps
- agentic evidence and policy evaluation
- human approvals at controlled decision points
- explicit exception handling for missing evidence and denial rescue

This is not a generic chatbot wrapped around claims data. It is an operational process with named tasks, gateways, retries, and handoffs.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the detailed Mermaid diagram and system notes.

High-level shape:

- UiPath Maestro BPMN is the orchestrator
- Cloudflare Worker exposes the public service surface used by API workflows
- a Render-hosted Mastra service provides an external policy-variance agent
- public reference APIs validate diagnosis and provider context
- deterministic logic keeps routing fail-closed when LLM enrichment is unavailable

## UiPath Components Used

- `UiPath Maestro BPMN` for the primary treatment-clearance process
- `UiPath Studio Web` for process modeling, workflows, and agent assets
- `UiPath API Workflows` for service-to-service orchestration
- `UiPath Agent Builder` for low-code agent roles in evidence and denial routing
- `UiPath Automation Cloud / Orchestrator` for deployment and execution management

Additional implementation surfaces used by the public reference stack:

- `Cloudflare Workers` for the deployable service layer used by the demo
- `Render` for the external Mastra agent runtime
- `Mastra` for the external policy-variance agent
- `OpenRouter` for optional LLM rationale generation inside the external agent

## Agent Type

Covenant uses **both** low-code and coded agents.

- `Low-code agents`: represented by UiPath Agent Builder roles in the BPMN design, especially evidence evaluation and denial rescue assistance
- `Coded agents`: the external Mastra policy-variance agent deployed on Render and invoked through the orchestrated flow

## Why UiPath Is The Right Platform For This Problem

Treatment clearance is not a single automation. It is a long-running operational process with branching decisions, retries, waiting states, compliance-sensitive approvals, and system handoffs. That is where UiPath is stronger than a standalone agent or a narrow API integration.

UiPath improves the solution in five concrete ways:

- `Maestro BPMN` gives the process an explicit enterprise workflow model instead of burying routing logic inside code.
- `API Workflows` let the process call payer, extraction, scheduling, notification, and audit services without turning Maestro into a custom integration layer.
- `Agent Builder` lets agents participate as governed workers inside the process instead of becoming the orchestrator themselves.
- `Human-in-the-loop control` keeps clinicians and physicians at high-impact checkpoints such as packet approval and appeal approval.
- `Orchestrator and execution traceability` make the full path auditable, which matters in healthcare operations where status, accountability, and exceptions must be visible.

In short, UiPath is valuable here because the problem is orchestration-heavy, stateful, and exception-driven.

## Example Flow

In the reference scenario, Covenant receives a lumbar MRI order, determines that prior authorization is required, identifies missing evidence, routes the order through remediation and approval, handles a denial, prepares an appeal, and then completes scheduling, patient communication, and audit generation after approval.

The point of the product is not only to submit prior authorization faster. The point is to keep the full treatment-clearance lifecycle governed from order intake to scheduled care.

## Live Deployment

Current public endpoints:

- Worker: `https://covenant-treatment-clearance.ndivij2004.workers.dev`
- External policy agent: `https://covenant-render-agent.onrender.com`

Verified live on June 27, 2026:

- Worker health responds successfully
- Render agent health responds successfully
- Worker policy-variance endpoint uses the Render-backed external agent
- `POST /demo/run` completes the denial-rescue-to-scheduling flow

## Judge Quick Start

Judges can validate Covenant without local setup by using the deployed services directly.

### Step 1: Verify the Worker

```bash
curl -sS https://covenant-treatment-clearance.ndivij2004.workers.dev/health
```

Expected result:

- `status: "ok"`
- `render_policy_agent_configured: true`

### Step 2: Verify the External Agent

```bash
curl -sS https://covenant-render-agent.onrender.com/health
```

Expected result:

- `status: "ok"`
- `framework: "Mastra"`

### Step 3: Run the End-to-End Demo

```bash
curl -sS -X POST \
  https://covenant-treatment-clearance.ndivij2004.workers.dev/demo/run
```

Expected result:

- the response completes the treatment-clearance flow
- the run reaches approval after denial rescue
- the response includes final scheduling and audit fields such as:
  - `payer_status`
  - `appointment_id`
  - `audit_packet_id`

### Step 4: Validate The External Agent Route

```bash
curl -sS -X POST \
  https://covenant-treatment-clearance.ndivij2004.workers.dev/external-agents/policy-variance \
  -H 'content-type: application/json' \
  -d '{"order_id":"ORD-MRI-1001"}'
```

Expected result:

- the response shows the external policy-variance step
- the response indicates the Render-backed agent is being used

## Public API Surface

Useful endpoints exposed by the Worker:

```text
GET  /health
GET  /ehr/orders/ORD-MRI-1001
GET  /public/diagnosis?orderId=ORD-MRI-1001
GET  /public/providers?orderId=ORD-MRI-1001
POST /documents/extract
POST /payer/coverage
POST /evidence/check
POST /external-agents/policy-variance
POST /payer/prior-auth
GET  /payer/prior-auth/{authId}
POST /appeals/build
POST /human/upload-missing-document
POST /human/approve-packet
POST /human/approve-appeal
POST /payer/prior-auth/{authId}/appeal
POST /schedule
POST /notify
POST /audit/packet
POST /demo/run
```

The API contract is documented in [openapi.yaml](./openapi.yaml).

## Local Development

### Prerequisites

- Python `3.11+`
- Node.js `18+`
- npm

### Option A: Run the Python reference service

```bash
cd covenantaccess
PYTHONPATH=src python -m covenantaccess.server --port 8088
```

In another terminal:

```bash
curl -s http://127.0.0.1:8088/health
curl -s -X POST http://127.0.0.1:8088/demo/run
```

### Option B: Run the external agent locally

```bash
cd covenantaccess/render-agent
npm install
export OPENROUTER_API_KEY=your_key_here
export OPENROUTER_MODEL=google/gemini-2.5-flash-lite
npm start
```

Default local endpoint:

```text
http://127.0.0.1:10000/health
```

### Option C: Run the Worker locally

In a new terminal:

```bash
cd covenantaccess
npm install
export RENDER_POLICY_VARIANCE_URL=http://127.0.0.1:10000
export OPENROUTER_API_KEY=your_key_here
export OPENROUTER_MODEL=google/gemini-2.5-flash-lite
npm run worker:dev
```

Default local Worker endpoint:

```text
http://127.0.0.1:8787/health
```

Then run:

```bash
curl -sS http://127.0.0.1:8787/health
curl -sS -X POST http://127.0.0.1:8787/demo/run
```

Expected local outcome:

- Worker health succeeds
- external agent health succeeds
- `/demo/run` completes the order through denial rescue, scheduling, notification, and audit

### Run tests and type checks

```bash
cd covenantaccess
python -m unittest discover -s tests
npm install
npm run worker:typecheck
```

## Deployment

### Cloudflare Worker

```bash
cd covenantaccess
npm install
npm run worker:deploy
```

Required Worker environment:

- `RENDER_POLICY_VARIANCE_URL`
- `OPENROUTER_API_KEY` optional
- `OPENROUTER_MODEL` optional

Required external-agent environment:

- `OPENROUTER_API_KEY` optional
- `OPENROUTER_MODEL` optional

### Render External Agent

The external policy-variance agent lives in:

```text
render-agent/src/policy-variance-agent.js
render-agent/src/server.js
```

Local run:

```bash
cd covenantaccess/render-agent
npm install
export OPENROUTER_API_KEY=...
export OPENROUTER_MODEL=google/gemini-2.5-flash-lite
npm start
```

The repository includes `render.yaml` for Render deployment.

## Operational Guardrail

Covenant is an administrative orchestration system. It prepares evidence, routes work, and escalates high-impact actions for human approval. It does not make independent treatment decisions.

## License

MIT. See [LICENSE](./LICENSE).
