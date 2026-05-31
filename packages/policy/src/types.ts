export type ChainKey = "arbitrum-sepolia" | "robinhood-testnet";

export type Address = `0x${string}`;

export type ApprovalMode = "auto" | "human";

export type PolicyTemplateId =
  | "conservative-investor"
  | "dca-only"
  | "tokenized-asset-basket"
  | "agent-sandbox"
  | "high-risk-with-approval";

export interface AssetRule {
  symbol: string;
  address: Address;
  decimals: number;
  maxActionAmount: string;
  dailyCap: string;
}

export interface PolicyTemplate {
  id: PolicyTemplateId;
  name: string;
  description: string;
  approvalMode: ApprovalMode;
  maxSlippageBps: number;
  cooldownSeconds: number;
  approvalThreshold: string;
  assets: AssetRule[];
  allowedVenues: Address[];
  allowedExecutors: Address[];
}

export interface PolicyPreview {
  template: PolicyTemplate;
  safetyScore: number;
  warnings: string[];
}

