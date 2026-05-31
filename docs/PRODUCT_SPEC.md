# Product Spec

## One-Liner

Covenant is an on-chain safety passport for AI-managed assets: users set enforceable wallet policies, agents propose actions, and Arbitrum smart contracts approve, reject, or require human review before funds move.

## Problem

AI agents, automated apps, and tokenized-finance interfaces are moving toward delegated financial action. Raw wallet delegation is too dangerous for mainstream users, especially when assets include tokenized equities, ETFs, RWAs, or high-value DeFi positions.

Users need more than a transaction confirmation modal. They need standing rules that can be enforced on-chain:

- max trade size
- daily exposure
- allowed assets
- approved protocols
- slippage tolerance
- cooldowns
- approval thresholds
- emergency pause
- authorized executors

## Product Thesis

Agent autonomy is not the product. Bounded autonomy is the product.

Covenant turns wallet safety rules into a programmable financial policy layer. Humans, apps, and AI agents can all propose actions, but the same on-chain guardrails decide whether the action is executable, blocked, or queued for review.

## Primary Users

- Retail users exploring tokenized assets who want self-custody without unlimited app permissions.
- Tokenized-asset apps that want safer execution flows for normal users.
- AI-agent developers who need credible wallet safety controls.
- Arbitrum and Robinhood Chain ecosystem builders who need reusable policy infrastructure.

## MVP User Flow

1. Connect wallet.
2. Create Safety Passport.
3. Select a policy template:
   - Conservative Investor
   - DCA Only
   - Tokenized Asset Basket
   - Agent Sandbox
   - High Risk With Approval
4. Configure limits:
   - allowed assets
   - per-action max
   - daily cap
   - slippage cap
   - cooldown
   - human approval threshold
   - authorized executor
5. Deposit demo assets or authorize the Covenant Vault.
6. Submit an action proposal.
7. See policy verdict:
   - executable
   - rejected
   - needs approval
   - paused
8. Execute allowed action or approve queued action.
9. View Covenant Receipt and explorer link.

## Memorable Demo

The judge asks the advisor to rebalance a tokenized asset basket conservatively. The agent proposes a valid action, Covenant approves it, and the UI shows a receipt.

Then the judge asks the advisor to put everything into a risky token. The agent proposes it, but Covenant rejects it because the action exceeds limits, touches an unapproved asset, and requires human review.

This demonstrates the product principle: agents propose, Covenant enforces.

## Differentiation

Covenant is not a DEX router, trading bot, or generic session-key wallet.

The wedge is policy-settled tokenized finance:

- Action lifecycle, not only wallet permission.
- Human and agent proposals share the same rules.
- Rejection reasons are first-class product output.
- Safety Passport creates a no-funds-needed user acquisition loop.
- Robinhood Chain/tokenized-asset positioning makes the product specific.

## Traction Loop

The Safety Passport should work before deposits.

A user can connect a wallet and receive an Agent Safety Score based on whether their wallet has:

- spend caps
- allowed executors
- human review thresholds
- emergency pause
- policy receipt history

The shareable result should push users toward creating a real Covenant policy.

