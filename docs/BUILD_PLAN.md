# Build Plan

## Current Phase: Pre-Build Foundation

Date context: May 21, 2026.

The buildathon registration window closes May 25, 2026. The product and architecture can be prepared now, but implementation should start during the buildathon window to keep the submission clean.

Pre-build deliverables:

- product thesis
- architecture
- contract module boundaries
- demo flow
- registration copy
- implementation plan

No production code should be committed before the build window unless the rules explicitly allow it.

## Phase 1: Contract Foundation

Target: May 25-27

- initialize fresh repo tooling
- add Foundry or Hardhat contract workspace
- implement `CovenantVault`
- implement `PolicyEngine`
- implement `ActionRouter`
- implement basic ERC-20 demo assets
- unit test allowed and rejected policy paths

Acceptance checks:

- allowed action passes
- unauthorized executor fails
- blocked asset fails
- amount cap fails
- slippage cap fails
- expiry fails
- paused vault fails

## Phase 2: Product UI

Target: May 28-31

- wallet connect
- create Safety Passport
- policy template selection
- vault dashboard
- proposal timeline
- verdict detail panel
- explorer link placeholders wired to deployment config

Acceptance checks:

- user can create a policy
- user can authorize executor
- user can submit demo proposal
- UI displays exact policy verdict
- UI displays receipt id or transaction hash

## Phase 3: Agent Proposal Lane

Target: June 1-4

- add advisor-agent proposal service
- keep agent output non-custodial and proposal-only
- convert natural language request into structured action proposal
- require contract validation for every proposal

Acceptance checks:

- conservative rebalance creates valid proposal
- unsafe request creates rejected proposal
- UI makes clear that the agent cannot bypass Covenant

## Phase 4: Arbitrum Deployment

Target: June 4-7

- deploy to Arbitrum Sepolia
- attempt Robinhood Chain testnet deploy
- configure explorer links
- verify contracts where tooling supports it
- document deployment addresses and transactions

Acceptance checks:

- deployed contract addresses recorded
- end-to-end demo transaction works on Arbitrum chain
- rejected action produces visible receipt or event

## Phase 5: Submission Polish

Target: June 8-14

- README
- architecture diagram
- demo script
- video script
- final deploy proof
- submission copy

Submission story:

Covenant is not another AI trading bot. It is the safety layer those bots need before users trust them with tokenized assets.

