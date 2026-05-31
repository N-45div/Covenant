import { readFile } from "node:fs/promises";
import { network } from "hardhat";
import { getAddress, parseUnits } from "viem";
import { defaultDeploymentPath, type CovenantDeployment } from "./deploy-lib.js";

const requestedNetwork = process.env.COVENANT_NETWORK;
if (!requestedNetwork) {
  throw new Error("Set COVENANT_NETWORK to a persistent network, for example arbitrumSepolia");
}

const networkName = requestedNetwork ?? "hardhat";
const inputPath = process.env.COVENANT_DEPLOYMENT_IN ?? defaultDeploymentPath(networkName);
const deployment = JSON.parse(await readFile(inputPath, "utf8")) as CovenantDeployment;
const connection = requestedNetwork ? await network.create(requestedNetwork) : await network.create();
const { viem } = connection;
const publicClient = await viem.getPublicClient();
const wallets = await viem.getWalletClients();
const caller = wallets.find(
  (wallet) => getAddress(wallet.account.address) === getAddress(deployment.demo.authorizedExecutor)
);

if (!caller) {
  throw new Error("No configured wallet matches the deployment's authorized executor");
}

if (getAddress(caller.account.address) !== getAddress(deployment.demo.authorizedExecutor)) {
  throw new Error("Configured wallet is not the deployment's authorized executor");
}

const router = await viem.getContractAt("ActionRouter", deployment.contracts.actionRouter);
const routerAsExecutor = await viem.getContractAt("ActionRouter", deployment.contracts.actionRouter, {
  client: { wallet: caller },
});
const token = await viem.getContractAt("MockToken", deployment.contracts.demoInputToken);
const amount = parseUnits("100", 18);
const before = (await token.read.balanceOf([caller.account.address])) as bigint;

const hash = await routerAsExecutor.write.propose([
  deployment.contracts.covenantVault,
  caller.account.address,
  {
    actor: getAddress(caller.account.address),
    action: deployment.demo.action,
    inputAsset: deployment.contracts.demoInputToken,
    outputAsset: deployment.contracts.demoOutputToken,
    amountIn: amount,
    minAmountOut: parseUnits("99", 18),
    quotedAmountOut: amount,
    deadline: 0,
  },
]);
await publicClient.waitForTransactionReceipt({ hash });

const nextProposalId = (await router.read.nextProposalId()) as bigint;
const proposalId = nextProposalId - 1n;
const status = (await router.read.statusOf([proposalId])) as number;
const after = (await token.read.balanceOf([caller.account.address])) as bigint;

if (status !== 3) {
  throw new Error(`Expected executed status 3, got ${status}`);
}
if (after - before !== amount) {
  throw new Error("Smoke transfer amount did not match routed proposal amount");
}

console.log(JSON.stringify({ proposalId: proposalId.toString(), status: Number(status), before: before.toString(), after: after.toString() }, null, 2));
