import { readFile } from "node:fs/promises";
import { createPublicClient, defineChain, http } from "viem";
import { defaultDeploymentPath, type CovenantDeployment } from "../../../contracts/scripts/deploy-lib.js";
import { indexCovenantEvents } from "./indexers/covenant-events.js";

const networkName = process.env.COVENANT_NETWORK ?? "arbitrumSepolia";
const inputPath = process.env.COVENANT_DEPLOYMENT_IN ?? defaultDeploymentPath(networkName);
const rpcUrl = process.env.COVENANT_RPC_URL ?? process.env.ARBITRUM_SEPOLIA_RPC_URL;

if (!rpcUrl) {
  throw new Error("Set COVENANT_RPC_URL or ARBITRUM_SEPOLIA_RPC_URL");
}

const deployment = JSON.parse(await readFile(inputPath, "utf8")) as CovenantDeployment;
const chain = defineChain({
  id: deployment.chainId,
  name: deployment.network,
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: { default: { http: [rpcUrl] } }
});
const client = createPublicClient({ chain, transport: http(rpcUrl) });
const fromBlock = process.env.COVENANT_FROM_BLOCK
  ? BigInt(process.env.COVENANT_FROM_BLOCK)
  : deployment.startBlock
    ? BigInt(deployment.startBlock)
    : 0n;
const events = await indexCovenantEvents(client, deployment, { fromBlock });

console.log(JSON.stringify({ deployment: deployment.network, events }, null, 2));
