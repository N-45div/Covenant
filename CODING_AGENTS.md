# Coding Agents Evidence

This file exists for the UiPath AgentHack coding-agents bonus category.

## Tool Used

- `OpenAI Codex`

## What Codex Contributed

Codex was used during the build and refinement of Covenant to help produce and harden:

- the Cloudflare Worker service layer and endpoint wiring
- the Render-hosted external Mastra policy-variance agent
- deployment and environment configuration
- README and architecture documentation aligned to Track 2 submission requirements
- Mermaid fixes and repo cleanup for public judging

## Where That Work Is Integrated

The coding-agent-assisted output is materially part of the working solution:

- `worker/src/index.ts`
- `render-agent/src/server.js`
- `render-agent/src/policy-variance-agent.js`
- `README.md`
- `ARCHITECTURE.md`
- `render.yaml`

## Verifiable Evidence

Prompt evidence from the real local Codex session history is tracked in:

- [`.codex/evidence/covenant-codex-prompts.jsonl`](./.codex/evidence/covenant-codex-prompts.jsonl)

That evidence shows Codex being used for:

- UiPath AgentHack Track 2 scoping
- Covenant naming and product framing
- deployment troubleshooting for Cloudflare and Render
- README and Mermaid architecture refinement
- final submission packaging requests

## Scope Note

Codex assisted the engineering and packaging workflow. UiPath Maestro remains the orchestration layer of the submitted product, and the deployed services remain the executable system being judged.
