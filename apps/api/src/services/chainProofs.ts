import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createPublicClient, defineChain, http, type Address } from "viem";
import { defaultDeploymentPath, type CovenantDeployment } from "../../../../contracts/scripts/deploy-lib.js";
import {
  eventsForVault,
  indexCovenantEvents,
  receiptForProposal,
  type CovenantIndexedEvent
} from "../../../worker/src/indexers/covenant-events.js";

const fallbackRpcs: Record<string, string> = {
  arbitrumSepolia: "https://sepolia-rollup.arbitrum.io/rpc",
  mantleSepolia: "https://rpc.sepolia.mantle.xyz"
};

export class ChainProofService {
  readonly #cache = new Map<string, CovenantIndexedEvent[]>();

  async deployment(network: string) {
    const path = defaultDeploymentPath(network);
    if (!existsSync(path)) return undefined;
    return JSON.parse(await readFile(path, "utf8")) as CovenantDeployment;
  }

  async timeline(network: string, vault: Address) {
    const events = await this.events(network);
    return eventsForVault(events, vault);
  }

  async receipt(network: string, proposalId: string) {
    const events = await this.events(network);
    return receiptForProposal(events, proposalId);
  }

  async events(network: string) {
    const cached = this.#cache.get(network);
    if (cached) return cached;

    const deployment = await this.deployment(network);
    if (!deployment) {
      throw new Error(`Missing deployment artifact for ${network}`);
    }

    const rpcUrl = process.env[`${deployment.network.toUpperCase()}_RPC_URL`]
      ?? process.env.COVENANT_RPC_URL
      ?? fallbackRpcs[deployment.network];

    if (!rpcUrl) {
      throw new Error(`Missing RPC URL for ${deployment.network}`);
    }

    const chain = defineChain({
      id: deployment.chainId,
      name: deployment.network,
      nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
      rpcUrls: { default: { http: [rpcUrl] } }
    });
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const fromBlock = deployment.startBlock ? BigInt(deployment.startBlock) : 0n;
    const events = await indexCovenantEvents(client, deployment, { fromBlock });
    this.#cache.set(network, events);
    return events;
  }
}
