# Architecture

## System Overview

Covenant has three layers:

1. Policy layer: stores user guardrails and validates proposed actions.
2. Execution layer: handles vault custody, action proposals, approvals, and execution.
3. Product layer: presents Safety Passport, policy templates, verdicts, receipts, and explorer proof.

## Contract Plan

### CovenantVault.sol

Responsibilities:

- accept deposits of supported ERC-20 demo assets
- allow owner withdrawals subject to pause and policy state
- store active policy reference
- authorize and revoke executors
- expose emergency pause

### PolicyEngine.sol

Responsibilities:

- validate proposed action against a policy
- check allowed asset
- check amount cap
- check daily cap
- check slippage bound
- check cooldown
- check expiry
- determine approval mode

Validation should return structured status codes instead of only reverting. This lets the UI and receipt layer explain why an action was allowed, rejected, or queued.

### ActionRouter.sol

Responsibilities:

- create action proposals
- request policy validation
- queue proposals requiring human approval
- execute valid proposals through approved venues
- block invalid proposals
- emit action lifecycle events

### AgentRegistry.sol

Responsibilities:

- register agent/app executor identities
- map executors to vault permissions
- store labels and metadata hashes
- enforce only authorized executors can propose or execute on behalf of a user

### CovenantReceipt.sol

Responsibilities:

- emit structured pass/fail receipt events
- store compact receipt metadata if needed
- expose receipt ids for frontend and explorer linking

### MockTokenizedAsset.sol

Demo-only ERC-20 asset representing tokenized stocks, ETFs, or RWAs.

### MockSwapVenue.sol

Demo-only venue used to execute deterministic buy/sell/rebalance actions. The venue should make slippage and rejection scenarios easy to test.

## Action Model

An action proposal should include:

- vault
- proposer
- executor
- input asset
- output asset
- input amount
- minimum output
- quoted output
- expiry
- venue
- action type
- metadata hash

## Verdict Model

Suggested verdicts:

- `APPROVED`
- `REJECTED_ASSET_NOT_ALLOWED`
- `REJECTED_AMOUNT_EXCEEDS_CAP`
- `REJECTED_DAILY_LIMIT`
- `REJECTED_SLIPPAGE`
- `REJECTED_EXPIRED`
- `REJECTED_COOLDOWN`
- `REQUIRES_HUMAN_APPROVAL`
- `REJECTED_UNAUTHORIZED_EXECUTOR`
- `REJECTED_PAUSED`

## Security Principles

- Fail closed when policy data is missing.
- Treat agent output as untrusted proposal data.
- Keep policy checks deterministic and contract-enforced.
- Prefer explicit status codes over ambiguous generic failures.
- Separate proposal authority from execution authority.
- Make emergency pause simple and highly visible.
- Keep demo venues isolated from production-facing architecture.

## Deployment Targets

Primary:

- Arbitrum Sepolia

Stretch:

- Robinhood Chain testnet

The buildathon requires deployment on an Arbitrum chain. Robinhood Chain alignment strengthens the tokenized-asset story if testnet tooling is stable enough during implementation.

