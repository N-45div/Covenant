# Covenant

## Treatment Clearance Orchestration in UiPath Maestro BPMN

Covenant is a Track 2 UiPath Maestro BPMN solution for treatment clearance in healthcare. It keeps treatment orders moving through coverage review, evidence collection, prior authorization, denial rescue, scheduling, patient communication, and audit generation inside one governed process.

UiPath is the orchestration layer. The surrounding services and agents are participants in that process, not replacements for it.

## Business Problem

Treatment orders often stall before the patient ever reaches care. The issue is not one slow API call. The issue is that the clearance workflow breaks across payers, clinics, reviewers, evidence packets, waiting states, and exception paths.

In practice that creates:

- open loops around prior authorization and status checks
- repeated manual chasing for missing documentation
- delayed reaction to denials
- weak visibility into who owns the next step
- fragmented auditability across systems

Covenant addresses that by modeling treatment clearance as one long-running BPMN process with explicit gateways, service calls, review checkpoints, and downstream outcomes.

## What The Solution Does

Covenant models a predictable treatment-clearance process in UiPath Maestro BPMN and supports it with API workflows, document extraction, coded policy analysis, governed review points, and audit generation.

Core flow:

1. receive the treatment order
2. check payer coverage and determine whether prior authorization is required
3. extract clinical and administrative evidence
4. evaluate completeness against payer requirements
5. route missing evidence to remediation and retry
6. route complete packets to governed review
7. submit prior authorization when required
8. monitor payer decision through a long-running process step
9. if denied, build denial rescue and prepare appeal
10. if approved or not required, schedule treatment
11. notify the patient
12. generate an audit packet

## Why This Fits Track 2

Track 2 asks for a BPMN 2.0 process that orchestrates APIs, agents, humans, and decisions through an end-to-end business flow. Covenant is built around that exact structure:

- UiPath Maestro BPMN owns the process model
- API Workflows connect the process to service endpoints
- coded agents evaluate policy variance under UiPath control
- governed review checkpoints stay inside the BPMN
- missing evidence and denial rescue are first-class branches, not side work

This is an orchestration product, not a generic assistant wrapped around healthcare text.

## Current Product Shape

The repository ships three executable layers:

1. `Covenant` BPMN in UiPath Studio Web
2. a public Cloudflare Worker service layer used by API Workflows
3. coded policy-variance agents:
   - a native UiPath coded agent project in `uipath-coded-agent/`
   - an external Render-hosted Mastra reference agent in `render-agent/`

The BPMN remains the source of coordination. The agents contribute routing analysis; they do not own process state.

## UiPath Components Used

- `UiPath Maestro BPMN` for the treatment-clearance process
- `UiPath Studio Web` for BPMN, workflows, and coded-agent project assets
- `UiPath API Workflows` for service-to-service orchestration
- `UiPath Coded Agents` for native policy-variance evaluation
- `UiPath Automation Cloud / Orchestrator` for execution and deployment context

Supporting implementation surfaces:

- `Cloudflare Workers` for the public backend used by the workflows
- `Render` for the external reference policy-variance runtime
- `Mastra` for the external reference coded-agent implementation
- `OpenRouter` for optional staff-facing rationale enrichment

## Agent Type

Covenant uses coded agents.

- `Native UiPath coded agent`: the `uipath-coded-agent/` project synced into Studio and invoked through `Start and wait for agent`
- `External coded agent reference`: the Render-hosted Mastra policy-variance service invoked through the Worker

The project does not depend on Agent Builder to make its primary orchestration story work.

## Why UiPath Is The Right Platform For This Problem

Treatment clearance is a long-running administrative process with branching decisions, waiting states, retries, evidence dependencies, and high-impact review steps. That is where UiPath is valuable:

- `Maestro BPMN` gives the workflow a durable enterprise process model instead of burying logic inside custom code
- `API Workflows` let the process call payer, extraction, scheduling, notification, and audit services through governed steps
- `Coded Agents` let policy-variance logic participate inside the process without becoming the orchestrator
- `Execution traceability` makes state and outcomes inspectable across the workflow
- `Governed review points` keep high-impact transitions visible and auditable

The strength of the platform here is orchestration discipline, not just automation breadth.

## Reference Scenarios

The public reference stack supports two useful scenarios:

### Scenario A: No prior auth required

- order: `ORD-XRAY-1002`
- result: coverage returns `requires_prior_auth = false`
- purpose: shows the honest `No prior auth` path

### Scenario B: Prior auth, missing evidence, denial rescue

- order: `ORD-MRI-1001`
- result: prior auth is required, missing documentation is detected, denial rescue and appeal logic are exercised
- purpose: shows the operationally complex path

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the Mermaid diagram and system notes.

High-level shape:

- UiPath Maestro BPMN is the control plane
- Cloudflare Worker exposes the public service surface used by API Workflows
- a native UiPath coded agent evaluates policy variance under BPMN control
- a Render-hosted Mastra service remains available as an external reference participant
- public diagnosis and provider lookup APIs enrich the reference stack
- deterministic routing remains authoritative when optional LLM enrichment is unavailable

## Live Deployment

Current public endpoints:

- Worker: `https://covenant-treatment-clearance.ndivij2004.workers.dev`
- External reference agent: `https://covenant-render-agent.onrender.com`

Verified in the public reference stack:

- Worker health responds successfully
- Worker type contracts accept both `snake_case` and `camelCase` payload variants
- no-auth coverage scenario is available for `ORD-XRAY-1002`
- denial-rescue demo run is available for `ORD-MRI-1001`

## Judge Quick Start

Judges can validate the service layer without local setup.

### 1. Verify Worker health

```bash
curl -sS https://covenant-treatment-clearance.ndivij2004.workers.dev/health
```

### 2. Verify the no-prior-auth branch

```bash
curl -sS -X POST \
  https://covenant-treatment-clearance.ndivij2004.workers.dev/payer/coverage \
  -H 'content-type: application/json' \
  -d '{"order_id":"ORD-XRAY-1002"}'
```

Expected outcome:

- `requires_prior_auth: false`
- `route: "no_prior_auth"`

### 3. Verify the prior-auth branch

```bash
curl -sS -X POST \
  https://covenant-treatment-clearance.ndivij2004.workers.dev/payer/coverage \
  -H 'content-type: application/json' \
  -d '{"order_id":"ORD-MRI-1001"}'
```

Expected outcome:

- `requires_prior_auth: true`
- `route: "prior_auth_required"`

### 4. Run the end-to-end reference demo

```bash
curl -sS -X POST \
  https://covenant-treatment-clearance.ndivij2004.workers.dev/demo/run
```

Expected outcome:

- the flow reaches denial rescue, appeal, approval, scheduling, and audit
- the final payload includes `payer_status`, `appointment_id`, and `audit_packet_id`

## Public API Surface

```text
GET  /health
GET  /ehr/orders/{orderId}
GET  /public/diagnosis?orderId={orderId}
GET  /public/providers?orderId={orderId}
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

Use [`.env.example`](./.env.example) as the baseline for local and hosted configuration.

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

### Option B: Run the external reference agent locally

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

### Option D: Package the native UiPath coded agent

```bash
cd covenantaccess/uipath-coded-agent
source .venv/bin/activate
uipath pack
```

## Tests and Type Checks

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

### Render external reference agent

```bash
cd covenantaccess/render-agent
npm install
npm start
```

The repository includes `render.yaml` for Render deployment.

## Operational Guardrail

Covenant is an administrative orchestration system. It prepares evidence, routes work, and escalates high-impact steps for governed review. It does not make treatment decisions or medical-necessity decisions on its own.

## License

MIT. See [LICENSE](./LICENSE).
