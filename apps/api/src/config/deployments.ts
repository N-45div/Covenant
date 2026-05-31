import arbitrumSepoliaDeployment from "../../../../deployments/arbitrumSepolia.json" with { type: "json" };
import type { Address, ChainKey } from "../../../../packages/policy/src/index.js";

export interface DeploymentConfig {
  chainKey: ChainKey | "mantle-sepolia";
  chainId: number;
  name: string;
  rpcEnv: string;
  explorerUrl: string;
  contracts: {
    covenantVault?: Address;
    policyEngine?: Address;
    actionRouter?: Address;
    agentRegistry?: Address;
    covenantReceipt?: Address;
  };
  features: {
    primary: boolean;
    tokenizedAssetDemo: boolean;
    agentExecutors: boolean;
  };
}

export const deployments: DeploymentConfig[] = [
  {
    chainKey: "arbitrum-sepolia",
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcEnv: "ARBITRUM_SEPOLIA_RPC_URL",
    explorerUrl: "https://sepolia.arbiscan.io",
    contracts: {
      covenantVault: arbitrumSepoliaDeployment.contracts.covenantVault as Address,
      policyEngine: arbitrumSepoliaDeployment.contracts.policyEngine as Address,
      actionRouter: arbitrumSepoliaDeployment.contracts.actionRouter as Address,
      covenantReceipt: arbitrumSepoliaDeployment.contracts.covenantReceipt as Address
    },
    features: {
      primary: true,
      tokenizedAssetDemo: true,
      agentExecutors: true
    }
  },
  {
    chainKey: "mantle-sepolia",
    chainId: 5003,
    name: "Mantle Sepolia",
    rpcEnv: "MANTLE_SEPOLIA_RPC_URL",
    explorerUrl: "https://explorer.sepolia.mantle.xyz",
    contracts: {},
    features: {
      primary: false,
      tokenizedAssetDemo: true,
      agentExecutors: true
    }
  },
  {
    chainKey: "robinhood-testnet",
    chainId: 46630,
    name: "Robinhood Chain Testnet",
    rpcEnv: "ROBINHOOD_CHAIN_RPC_URL",
    explorerUrl: "https://explorer.testnet.chain.robinhood.com",
    contracts: {},
    features: {
      primary: false,
      tokenizedAssetDemo: true,
      agentExecutors: true
    }
  }
];
