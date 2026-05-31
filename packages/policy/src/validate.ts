import type { Address, PolicyTemplate } from "./types.js";
import type { VerdictCode } from "./verdicts.js";

export interface ActionProposalInput {
  proposer: Address;
  executor: Address;
  inputAsset: Address;
  outputAsset: Address;
  amountIn: string;
  minAmountOut: string;
  quotedAmountOut: string;
  deadline: number;
  venue: Address;
  actionType: string;
  metadataHash?: `0x${string}`;
}

export interface PolicyVerdict {
  code: VerdictCode;
  terminal: boolean;
  reason: string;
}

export function evaluateProposal(
  template: PolicyTemplate,
  proposal: ActionProposalInput,
  nowSeconds = Math.floor(Date.now() / 1000)
): PolicyVerdict {
  const inputRule = template.assets.find((asset) => asset.address === proposal.inputAsset);
  const outputRule = template.assets.find((asset) => asset.address === proposal.outputAsset);

  if (!inputRule || !outputRule) {
    return rejected("REJECTED_ASSET_NOT_ALLOWED", "Action touches an asset outside the policy.");
  }

  if (!template.allowedVenues.includes(proposal.venue)) {
    return rejected("REJECTED_VENUE_NOT_ALLOWED", "Action uses a venue outside the policy.");
  }

  if (proposal.deadline !== 0 && proposal.deadline < nowSeconds) {
    return rejected("REJECTED_EXPIRED", "Action proposal has expired.");
  }

  const amountIn = BigInt(proposal.amountIn);
  const quotedAmountOut = BigInt(proposal.quotedAmountOut);
  const minAmountOut = BigInt(proposal.minAmountOut);
  const maxActionAmount = BigInt(inputRule.maxActionAmount);

  if (amountIn > maxActionAmount) {
    return rejected("REJECTED_AMOUNT_EXCEEDS_CAP", "Action exceeds the per-action amount cap.");
  }

  const minimumOutputBps = 10_000n - BigInt(template.maxSlippageBps);
  if (quotedAmountOut > 0n && minAmountOut * 10_000n < quotedAmountOut * minimumOutputBps) {
    return rejected("REJECTED_SLIPPAGE", "Quoted output violates the slippage limit.");
  }

  if (template.approvalMode === "human" || amountIn >= BigInt(template.approvalThreshold)) {
    return {
      code: "REQUIRES_HUMAN_APPROVAL",
      terminal: false,
      reason: "Action is valid but crosses a human review threshold."
    };
  }

  return {
    code: "APPROVED",
    terminal: true,
    reason: "Action is inside the wallet covenant and can execute."
  };
}

function rejected(code: VerdictCode, reason: string): PolicyVerdict {
  return { code, terminal: true, reason };
}

