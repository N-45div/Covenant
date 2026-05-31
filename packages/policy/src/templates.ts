import type { Address, PolicyTemplate, PolicyTemplateId } from "./types.js";

const USDC: Address = "0x0000000000000000000000000000000000000001";
const TBILL: Address = "0x0000000000000000000000000000000000000002";
const EQUITY: Address = "0x0000000000000000000000000000000000000003";
const DEMO_VENUE: Address = "0x0000000000000000000000000000000000000100";

const assets = {
  usdc: {
    symbol: "USDC",
    address: USDC,
    decimals: 6,
    maxActionAmount: "250000000",
    dailyCap: "1000000000"
  },
  tbill: {
    symbol: "tTBILL",
    address: TBILL,
    decimals: 6,
    maxActionAmount: "500000000",
    dailyCap: "1500000000"
  },
  equity: {
    symbol: "tEQUITY",
    address: EQUITY,
    decimals: 6,
    maxActionAmount: "100000000",
    dailyCap: "300000000"
  }
} as const;

export const policyTemplates: PolicyTemplate[] = [
  {
    id: "conservative-investor",
    name: "Conservative Investor",
    description: "Low-slippage tokenized asset movement with strict caps.",
    approvalMode: "auto",
    maxSlippageBps: 50,
    cooldownSeconds: 3600,
    approvalThreshold: "750000000",
    assets: [assets.usdc, assets.tbill],
    allowedVenues: [DEMO_VENUE],
    allowedExecutors: []
  },
  {
    id: "dca-only",
    name: "DCA Only",
    description: "Small recurring buys with narrow execution boundaries.",
    approvalMode: "auto",
    maxSlippageBps: 75,
    cooldownSeconds: 86400,
    approvalThreshold: "300000000",
    assets: [assets.usdc, assets.tbill, assets.equity],
    allowedVenues: [DEMO_VENUE],
    allowedExecutors: []
  },
  {
    id: "tokenized-asset-basket",
    name: "Tokenized Asset Basket",
    description: "Balanced tokenized finance demo policy for the judge flow.",
    approvalMode: "auto",
    maxSlippageBps: 100,
    cooldownSeconds: 1800,
    approvalThreshold: "1000000000",
    assets: [assets.usdc, assets.tbill, assets.equity],
    allowedVenues: [DEMO_VENUE],
    allowedExecutors: []
  },
  {
    id: "agent-sandbox",
    name: "Agent Sandbox",
    description: "Tight caps for proposal-only agents and new apps.",
    approvalMode: "human",
    maxSlippageBps: 30,
    cooldownSeconds: 900,
    approvalThreshold: "100000000",
    assets: [assets.usdc],
    allowedVenues: [DEMO_VENUE],
    allowedExecutors: []
  },
  {
    id: "high-risk-with-approval",
    name: "High Risk With Approval",
    description: "Broader asset access, but large or unusual actions queue.",
    approvalMode: "human",
    maxSlippageBps: 250,
    cooldownSeconds: 600,
    approvalThreshold: "200000000",
    assets: [assets.usdc, assets.tbill, assets.equity],
    allowedVenues: [DEMO_VENUE],
    allowedExecutors: []
  }
];

export function getPolicyTemplate(id: PolicyTemplateId) {
  return policyTemplates.find((template) => template.id === id);
}

