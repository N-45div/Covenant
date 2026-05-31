import { config as loadEnv } from "dotenv";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { configVariable, defineConfig } from "hardhat/config";

loadEnv();

export default defineConfig({
  plugins: [hardhatViem],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    arbitrumSepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")]
    },
    mantleSepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("MANTLE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")]
    },
    robinhoodTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("ROBINHOOD_CHAIN_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")]
    }
  }
});
