export type VerdictCode =
  | "APPROVED"
  | "REQUIRES_HUMAN_APPROVAL"
  | "REJECTED_ASSET_NOT_ALLOWED"
  | "REJECTED_AMOUNT_EXCEEDS_CAP"
  | "REJECTED_DAILY_LIMIT"
  | "REJECTED_SLIPPAGE"
  | "REJECTED_EXPIRED"
  | "REJECTED_COOLDOWN"
  | "REJECTED_UNAUTHORIZED_EXECUTOR"
  | "REJECTED_VENUE_NOT_ALLOWED"
  | "REJECTED_PAUSED";

export const verdictCopy: Record<VerdictCode, string> = {
  APPROVED: "Action is inside the wallet covenant and can execute.",
  REQUIRES_HUMAN_APPROVAL: "Action is valid but crosses a human review threshold.",
  REJECTED_ASSET_NOT_ALLOWED: "Action touches an asset outside the policy.",
  REJECTED_AMOUNT_EXCEEDS_CAP: "Action exceeds the per-action amount cap.",
  REJECTED_DAILY_LIMIT: "Action would exceed the daily movement cap.",
  REJECTED_SLIPPAGE: "Quoted output violates the slippage limit.",
  REJECTED_EXPIRED: "Action proposal has expired.",
  REJECTED_COOLDOWN: "Action violates the wallet cooldown window.",
  REJECTED_UNAUTHORIZED_EXECUTOR: "Executor is not authorized for this wallet.",
  REJECTED_VENUE_NOT_ALLOWED: "Action uses a venue outside the policy.",
  REJECTED_PAUSED: "Wallet covenant is paused."
};

