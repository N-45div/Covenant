# Covenant Render Agent

Mastra-based external policy-variance agent for Covenant.

This service is deployed separately from the Cloudflare Worker so the main UiPath-orchestrated backend stays clean while the external agent runs on a standard Node runtime.

## Endpoints

- `GET /health`
- `POST /external-agents/policy-variance`

## Environment

- `OPENROUTER_API_KEY` - optional; enables LLM rationale enrichment.
- `OPENROUTER_MODEL` - optional; defaults to `openai/gpt-4o-mini`.

## Local run

```bash
cd covenantaccess/render-agent
npm install
npm start
```

## Render

The root `render.yaml` points Render at this service via `rootDir: render-agent`.
