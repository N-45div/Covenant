import { defineChain, type Chain } from "viem";
import { arbitrumSepolia } from "viem/chains";
import type { NetworkKey } from "./deployments";

export const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.sepolia.mantle.xyz"] } },
  blockExplorers: {
    default: { name: "Mantle Sepolia Explorer", url: "https://explorer.sepolia.mantle.xyz" }
  },
  testnet: true
});

export const chains = {
  arbitrumSepolia,
  mantleSepolia
} as const satisfies Record<NetworkKey, Chain>;

export const factoryAbi = [
  {
    type: "function",
    name: "createCovenant",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "inputAssets", type: "address[]" },
          { name: "outputAssets", type: "address[]" },
          { name: "actionLimits", type: "tuple[]", components: [{ name: "action", type: "bytes4" }, { name: "amountCap", type: "uint256" }] },
          { name: "minOutputBps", type: "uint16" },
          { name: "expiresAt", type: "uint64" },
          { name: "cooldownSeconds", type: "uint64" },
          { name: "humanApprovalThreshold", type: "uint256" }
        ]
      },
      { name: "initialExecutor", type: "address" }
    ],
    outputs: [{ name: "policyId", type: "uint256" }, { name: "vault", type: "address" }]
  },
  { type: "function", name: "vaultCount", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "vaultOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "address" }] }
] as const;

export const tokenAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }
] as const;

export const vaultAbi = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] }
] as const;

export const routerAbi = [
  {
    type: "function",
    name: "propose",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultAddress", type: "address" },
      { name: "recipient", type: "address" },
      {
        name: "proposal",
        type: "tuple",
        components: [
          { name: "actor", type: "address" },
          { name: "action", type: "bytes4" },
          { name: "inputAsset", type: "address" },
          { name: "outputAsset", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "minAmountOut", type: "uint256" },
          { name: "quotedAmountOut", type: "uint256" },
          { name: "deadline", type: "uint64" }
        ]
      }
    ],
    outputs: [{ name: "proposalId", type: "uint256" }]
  }
] as const;
