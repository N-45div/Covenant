# Covenant

Treatment Clearance & Denial Rescue Orchestrator.

Because treatment should not wait in paperwork.

Covenant is a UiPath Track 2 solution backend for a Maestro BPMN process that clears ordered care through insurance eligibility, evidence gathering, prior authorization, denial rescue, scheduling, patient updates, and audit.

The project is designed around a deterministic BPMN flow where UiPath Maestro is the control plane. Agents prepare evidence and draft packets, but licensed staff approve submissions and appeals. The main orchestrator stays in UiPath; the external policy agent runs separately on Render so the submission keeps a real agent boundary without breaking the Worker bundle.

## What It Solves

A doctor orders treatment, but the patient can be blocked by eligibility checks, missing documents, prior authorization, payer follow-up, denials, and scheduling handoffs.

Covenant prevents the order from becoming an open loop. It keeps the process moving until the patient is either scheduled or the denial has a physician-reviewed rescue path.

## UiPath Components

- Maestro BPMN: main end-to-end treatment clearance process.
- Studio Web: implementation surface for workflows, API workflows, and agents.
- API Workflows: mock EHR, payer, scheduling, patient notification, and audit calls.
- Document Understanding / IXP: clinical note, referral, insurance card, and denial-letter extraction.
- Action Center / User Tasks: low-confidence extraction review, missing-document upload, submission approval, appeal approval.
- Agent Builder: evidence checklist agent, denial rescue agent, patient update agent.
- External agent framework: Mastra policy variance agent deployed as a separate Render web service, exposed through an API Workflow endpoint so Maestro remains the orchestrator.
- Optional external LLM endpoint: OpenRouter enriches the Mastra agent's deterministic routing decision with a concise staff-facing rationale when `OPENROUTER_API_KEY` is configured.
- Data Fabric: persistent clearance record, payer decision history, missing evidence, and audit packet metadata.
- Orchestrator: publishing, folder permissions, API workflow deployment, execution history.
- Maestro monitoring / Insights: SLA, bottleneck, denial, missing-doc, and appeal metrics.
- UiPath for Coding Agents / Codex: used to scaffold the mock services, process artifacts, and tests for bonus-point evidence.

## Demo Scenario

The included scenario follows an ordered lumbar MRI.

1. Doctor order arrives from the mock EHR.
2. Payer API says prior authorization is required.
3. Document extraction finds clinical evidence but misses one required item.
4. Clinic user uploads the missing physical therapy note.
5. Evidence agent rebuilds the packet.
6. External Mastra policy variance agent independently checks payer-policy risk before submission.
7. Clinician approves prior-auth submission.
8. Payer denies with a specific reason.
9. External Mastra policy variance agent routes the denial to rescue.
10. Denial rescue agent builds an appeal packet.
11. Physician approves appeal.
12. Payer approves after appeal.
13. Scheduling API books the MRI.
14. Patient notification is sent.
15. Audit packet is generated.

## Run Locally

Requires Python 3.11+.

```bash
cd covenantaccess
PYTHONPATH=src python -m covenantaccess.server --port 8088
```

In another terminal:

```bash
curl -s http://127.0.0.1:8088/health
curl -s -X POST http://127.0.0.1:8088/demo/run
```

Run tests:

```bash
cd covenantaccess
python -m unittest discover -s tests
```

## Deploy to Cloudflare Workers

The `worker/` implementation is the deployable public API for UiPath API Workflows.

Use your own Cloudflare account or temporary deploy claim URL for the Worker service. The exact public URL depends on the account that performs the deploy.

```bash
cd covenantaccess
npm install
npm run worker:deploy
```

Useful endpoints after deploy:

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

The OpenAPI contract is in `openapi.yaml`.

Quick verification:

```bash
curl -sS https://<your-worker-url>/health
curl -sS 'https://<your-worker-url>/public/diagnosis?orderId=ORD-MRI-1001'
curl -sS -X POST https://<your-worker-url>/demo/run
```

The Worker uses real public APIs for ICD-10-CM and provider-reference validation, then uses a transparent payer simulator for prior authorization and denial rescue.

## External Mastra Agent

Covenant includes an external Mastra agent deployed separately on Render:

```text
render-agent/src/policy-variance-agent.js
```

It is exposed through:

```text
POST /external-agents/policy-variance
```

The Mastra policy variance agent checks the current coverage, evidence packet, and payer decision, then returns a governed routing recommendation:

- `missing_evidence` when payer-required documentation is missing.
- `clinician_review` when the packet is complete but needs human approval before payer submission.
- `denial_rescue` when a payer denial needs appeal preparation and physician approval.
- `ready_for_submission` when no prior authorization or policy gap remains.

UiPath Maestro remains the control plane: the external agent is called through API Workflows and its result is used as another governed signal inside the BPMN process.

The agent has two layers:

1. Deterministic Mastra workflow for reliable routing and audit fields.
2. Optional OpenRouter enrichment for a concise staff-facing rationale.

OpenRouter is fail-closed: if no API key is configured, or if the LLM call fails, the endpoint still returns the deterministic Mastra result with `llm_status` set to `not_configured` or `failed`.

To enable LLM enrichment on Render:

```bash
cd covenantaccess/render-agent
export OPENROUTER_API_KEY=...
export OPENROUTER_MODEL=openai/gpt-4o-mini
npm start
```

`OPENROUTER_MODEL` is optional. The default is:

```text
openai/gpt-4o-mini
```

### Render deployment

The repository includes `render.yaml` so you can deploy the Mastra agent as a free Render web service.

Recommended flow:

```bash
cd covenantaccess
render login
render blueprints validate render.yaml
```

Then create the web service from the blueprint in Render, or use the CLI deploy flow shown in Render's docs, and set the resulting public URL in the Worker environment variable:

```text
RENDER_POLICY_VARIANCE_URL=https://<your-render-service>
```

If that URL is not configured, the Worker falls back to a local deterministic policy-variance evaluation so the demo still runs.

## Submission Guardrail

Covenant does not make clinical treatment decisions. It assembles administrative evidence, checks payer documentation requirements, drafts packets, and routes high-impact steps to licensed humans for review.

## License

MIT.
