# Covenant Architecture

## System Diagram

```mermaid
flowchart LR
    A[Doctor Order Received] --> B[UiPath Maestro BPMN]

    subgraph UiPath["UiPath Automation Cloud"]
        B --> C[API Workflow: Coverage Check]
        B --> D[API Workflow: Document Extract]
        B --> E[Agent Step: Evidence Evaluation]
        B --> F[Human Review Gate]
        B --> G[API Workflow: Prior Auth Submission]
        B --> H[API Workflow: Payer Status Check]
        B --> I[Agent Step: Denial Rescue]
        B --> J[Human Appeal Approval]
        B --> K[API Workflow: Scheduling]
        B --> L[API Workflow: Patient Update]
        B --> M[API Workflow: Audit Packet]
    end

    subgraph Worker["Cloudflare Worker Service Layer"]
        N[/POST payer/coverage/]
        O[/POST documents/extract/]
        P[/POST evidence/check/]
        Q[/POST external-agents/policy-variance/]
        R[/POST payer/prior-auth/]
        S[/GET payer/prior-auth/{authId}/]
        T[/POST appeals/build/]
        U[/POST schedule/]
        V[/POST notify/]
        W[/POST audit/packet/]
    end

    subgraph External["External Services and Agents"]
        X[Render Mastra Policy Variance Agent]
        Y[OpenRouter LLM Rationale]
        Z[NLM ICD-10 Validation]
        AA[NPPES Provider Validation]
    end

    C --> N
    D --> O
    E --> P
    E --> Q
    G --> R
    H --> S
    I --> T
    K --> U
    L --> V
    M --> W

    Q --> X
    X --> Y
    N --> Z
    N --> AA

    S -->|Denied| I
    S -->|Approved| K
    P -->|Missing Evidence| F
    P -->|Complete| G
    T --> J
```

## Flow Notes

### 1. Control plane

UiPath Maestro BPMN is the system of coordination. It owns process state, routing, retry behavior, and approval sequencing.

### 2. Service layer

The Cloudflare Worker exposes a stable HTTP surface for coverage checks, extraction, evidence analysis, submission, scheduling, notification, and audit generation. This is the reproducible public backend used by the demo.

### 3. External coded agent

The Render-hosted Mastra service is invoked as an external participant, not as the orchestrator. It evaluates policy variance and denial-rescue routing under UiPath control.

### 4. Optional LLM enrichment

OpenRouter adds concise staff-facing rationale to the external agent output. Deterministic routing remains authoritative if LLM enrichment is unavailable.

### 5. Human checkpoints

The process includes explicit approval points before submission and appeal. In the public reference stack these are exposed as approval endpoints for reproducibility; in the BPMN model they remain governed human review stages.

## Why this architecture is submission-strong

- It is clearly BPMN-first, which aligns with Track 2.
- It shows humans, APIs, agents, and decisions in one system.
- It handles exceptions, not just the happy path.
- It preserves UiPath as the orchestration layer even when external agents are used.
- It provides a deployable, testable public reference surface for judging.
