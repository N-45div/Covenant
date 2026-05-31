# Backend Plan

## Goal

Build Covenant as a contract-enforced backend for Safety Passports, policy
templates, action proposals, verdicts, receipts, and Arbitrum deployments.

The backend can help users and agents prepare proposals, but contracts remain
the enforcement layer. If an action moves assets, the chain must decide whether
it is allowed, rejected, or queued for human approval.

## Stack

- Solidity contracts with a local TypeScript test/deploy harness.
- Node.js and TypeScript for API, worker, SDK, and scripts.
- Fastify for HTTP routes.
- Zod for request and policy schema validation.
- Viem for chain reads, writes, simulation, and event indexing.
- In-memory repositories for MVP, with clean interfaces for Postgres/Drizzle.

## Repository Layout

```txt
contracts/
  src/
  test/
  scripts/
apps/
  api/
    src/config/
    src/routes/
    src/schemas/
    src/services/
  worker/
    src/indexers/
packages/
  policy/
    src/templates/
    src/verdicts.ts
    src/types.ts
  sdk/
    src/client.ts
deployments/
```

## Contract Surface

- `CovenantVault`: custody, active policy, executor authorization, pause.
- `PolicyEngine`: deterministic validation and verdict codes.
- `ActionRouter`: proposal, queue, approval, execution, rejection lifecycle.
- `AgentRegistry`: app/agent executor identity and metadata.
- `CovenantReceipt`: structured events for terminal verdicts.
- `MockTokenizedAsset`: demo ERC-20-like tokenized asset.
- `MockSwapVenue`: deterministic venue for safe and unsafe demo actions.

## API Surface

- `GET /health`
- `GET /deployments`
- `GET /templates`
- `POST /passports`
- `GET /passports/:wallet`
- `POST /policies/preview`
- `POST /proposals`
- `GET /proposals/:id`
- `POST /proposals/:id/approve`
- `POST /proposals/:id/execute`
- `GET /receipts/:id`
- `GET /vaults/:address/timeline`

## Services

- `DeploymentService`: chain ids, contract addresses, explorers, feature flags.
- `TemplateService`: Conservative Investor, DCA Only, Tokenized Asset Basket,
  Agent Sandbox, and High Risk With Approval templates.
- `PolicyService`: converts template settings to contract-ready policy structs.
- `PassportService`: wallet policy profile and safety score.
- `ProposalService`: validates proposal payloads and submits lifecycle actions.
- `VerdictService`: maps on-chain verdict codes to clear product reasons.
- `ReceiptService`: reads/indexes proposal and verdict events.

## Test Strategy

- Contract unit tests for allowed actions, unauthorized executors, blocked
  assets, amount caps, daily caps, slippage, expiry, cooldown, human approval,
  and pause.
- API tests for schema validation, template conversion, deployment config, and
  verdict copy.
- Integration test with local chain: deploy contracts, create policy, submit
  safe proposal, submit unsafe proposal, index receipts.
- Smoke deploy first to Arbitrum Sepolia, then Robinhood Chain testnet if
  tooling and RPC behavior are stable.

## Commit Discipline

Every checkpoint should be committed independently. Before each commit, run:

```bash
git diff --cached --shortstat
```

Target less than 1000 insertions per commit. Ideal chunks are 250 to 700
insertions when possible.
