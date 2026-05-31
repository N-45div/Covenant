# Covenant

Programmable trust for tokenized finance on Arbitrum.

Covenant is an on-chain safety passport for AI-managed and app-managed assets. Users define enforceable financial guardrails, apps or agents propose actions, and Arbitrum smart contracts approve, reject, or require human review before funds move.

## Buildathon Positioning

Covenant is being prepared for the Arbitrum Open House London Online Buildathon. The implementation should start inside the buildathon window. This repo currently contains planning, architecture, and product specification only.

The project targets Arbitrum chains, with Arbitrum Sepolia as the primary execution target and Robinhood Chain as the sponsor-aligned stretch target.

## Core Insight

Most agentic finance demos focus on agents doing trades. Covenant focuses on agents being controlled.

Tokenized assets and self-custody need a safety layer before normal users will trust apps, bots, or AI agents with financial authority. Covenant lets users define an on-chain risk constitution for a wallet:

- which assets can be touched
- how much can move
- who can propose or execute actions
- when human approval is required
- when actions are rejected automatically
- how every pass or failure is proven

## MVP Modules

- Safety Passport: user-facing wallet policy profile and risk score.
- Covenant Vault: custody and emergency controls for protected assets.
- Policy Engine: deterministic validation of asset, amount, slippage, cooldown, expiry, and approval rules.
- Action Router: proposal, approval, execution, and rejection lifecycle.
- Agent Registry: authorization layer for apps, bots, and AI agents.
- Covenant Receipts: structured on-chain events explaining allowed and rejected actions.
- Demo Venue: controlled tokenized-asset and swap venue contracts for deterministic demos.

## Demo Story

1. A user creates a Safety Passport.
2. They choose a policy template, such as Conservative Tokenized Asset Basket.
3. They authorize an advisor agent or app.
4. The agent proposes a rebalance.
5. Covenant validates the proposal against on-chain policy.
6. Allowed actions execute and emit a receipt.
7. Unsafe actions are rejected with explicit reasons.
8. The UI shows the timeline and explorer proof.

## Documentation

- [Product Spec](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Build Plan](docs/BUILD_PLAN.md)
- [Registration Copy](docs/REGISTRATION_COPY.md)

