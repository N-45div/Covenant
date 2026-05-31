import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseUnits, zeroAddress } from "viem";

const REBALANCE = "0x7265626c";

type NetworkConnection = Awaited<ReturnType<typeof import("hardhat").network.create>>;
type ViemManager = NetworkConnection["viem"];

export interface CovenantDeployment {
  network: string;
  chainId: number;
  deployer: `0x${string}`;
  createdAt: string;
  policyId: string;
  contracts: {
    policyEngine: `0x${string}`;
    covenantReceipt: `0x${string}`;
    actionRouter: `0x${string}`;
    covenantVault: `0x${string}`;
    demoInputToken: `0x${string}`;
    demoOutputToken: `0x${string}`;
  };
  demo: {
    authorizedExecutor: `0x${string}`;
    action: `0x${string}`;
    vaultSeedAmount: string;
    perActionCap: string;
    humanApprovalThreshold: string;
  };
}

export async function deployCovenantStack(
  viem: ViemManager,
  networkName: string,
  outputPath?: string
): Promise<CovenantDeployment> {
  const publicClient = await viem.getPublicClient();
  const [deployer, executor] = await viem.getWalletClients();
  const chainId = await publicClient.getChainId();

  const policyEngine = await viem.deployContract("PolicyEngine");
  const receipt = await viem.deployContract("CovenantReceipt", [zeroAddress]);
  const router = await viem.deployContract("ActionRouter", [policyEngine.address, receipt.address]);
  await receipt.write.setRouter([router.address]);

  const inputToken = await viem.deployContract("MockToken", ["Demo Tokenized USD", "dtUSD"]);
  const outputToken = await viem.deployContract("MockToken", ["Demo Tokenized Bill", "dtBILL"]);
  const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
  const vaultSeedAmount = parseUnits("2000", 18);
  const perActionCap = parseUnits("1000", 18);
  const humanApprovalThreshold = parseUnits("500", 18);

  await policyEngine.write.createPolicy([
    [inputToken.address],
    [outputToken.address],
    [{ action: REBALANCE, amountCap: perActionCap }],
    9_800,
    Number(latestBlock.timestamp + 86_400n),
    0,
    humanApprovalThreshold,
  ]);
  await policyEngine.write.setExecutionRecorder([1n, router.address, true]);

  const vault = await viem.deployContract("CovenantVault", [deployer.account.address, router.address, 1n]);
  await vault.write.setExecutor([executor.account.address, true]);
  await inputToken.write.mint([deployer.account.address, vaultSeedAmount]);
  await inputToken.write.approve([vault.address, vaultSeedAmount]);
  await vault.write.deposit([inputToken.address, vaultSeedAmount]);

  const deployment: CovenantDeployment = {
    network: networkName,
    chainId,
    deployer: deployer.account.address,
    createdAt: new Date().toISOString(),
    policyId: "1",
    contracts: {
      policyEngine: policyEngine.address,
      covenantReceipt: receipt.address,
      actionRouter: router.address,
      covenantVault: vault.address,
      demoInputToken: inputToken.address,
      demoOutputToken: outputToken.address,
    },
    demo: {
      authorizedExecutor: executor.account.address,
      action: REBALANCE,
      vaultSeedAmount: vaultSeedAmount.toString(),
      perActionCap: perActionCap.toString(),
      humanApprovalThreshold: humanApprovalThreshold.toString(),
    },
  };

  if (outputPath) {
    await writeDeployment(outputPath, deployment);
  }

  return deployment;
}

export async function writeDeployment(path: string, deployment: CovenantDeployment) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(deployment, null, 2)}\n`);
}

export function defaultDeploymentPath(networkName: string) {
  return join("deployments", `${networkName}.json`);
}

