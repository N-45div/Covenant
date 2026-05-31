import { describe, expect, it } from "vitest";
import { network } from "hardhat";
import { getAddress, parseUnits, zeroAddress } from "viem";

const REBALANCE = "0x7265626c";

interface PolicyConfigRead {
  owner: `0x${string}`;
}

describe("CovenantFactory", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [, user, executor, recipient] = await viem.getWalletClients();

  it("lets any user create and own a Covenant vault", async () => {
    const engine = await viem.deployContract("PolicyEngine");
    const receipt = await viem.deployContract("CovenantReceipt", [zeroAddress]);
    const router = await viem.deployContract("ActionRouter", [engine.address, receipt.address]);
    const factory = await viem.deployContract("CovenantFactory", [engine.address, router.address]);
    const tokenA = await viem.deployContract("MockToken", ["Public USD", "pUSD"]);
    const tokenB = await viem.deployContract("MockToken", ["Public Bill", "pBILL"]);
    const factoryAsUser = await viem.getContractAt("CovenantFactory", factory.address, {
      client: { wallet: user },
    });
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });

    await receipt.write.setRouter([router.address]);
    await factoryAsUser.write.createCovenant([
      {
        inputAssets: [tokenA.address],
        outputAssets: [tokenB.address],
        actionLimits: [{ action: REBALANCE, amountCap: parseUnits("1000", 18) }],
        minOutputBps: 9_800,
        expiresAt: Number(latestBlock.timestamp + 86_400n),
        cooldownSeconds: 0,
        humanApprovalThreshold: parseUnits("500", 18),
      },
      executor.account.address,
    ]);

    const vaultAddress = (await factory.read.vaultOf([user.account.address, 0n])) as `0x${string}`;
    const vault = await viem.getContractAt("CovenantVault", vaultAddress);
    const policy = (await engine.read.policy([1n])) as PolicyConfigRead;

    expect(policy.owner).toBe(getAddress(user.account.address));
    expect(await vault.read.owner()).toBe(getAddress(user.account.address));
    expect(await vault.read.authorizedExecutor([executor.account.address])).toBe(true);

    await tokenA.write.mint([user.account.address, parseUnits("200", 18)]);
    const tokenAsUser = await viem.getContractAt("MockToken", tokenA.address, { client: { wallet: user } });
    const vaultAsUser = await viem.getContractAt("CovenantVault", vaultAddress, { client: { wallet: user } });
    await tokenAsUser.write.approve([vaultAddress, parseUnits("200", 18)]);
    await vaultAsUser.write.deposit([tokenA.address, parseUnits("200", 18)]);

    const routerAsExecutor = await viem.getContractAt("ActionRouter", router.address, {
      client: { wallet: executor },
    });
    await routerAsExecutor.write.propose([
      vaultAddress,
      recipient.account.address,
      {
        actor: getAddress(executor.account.address),
        action: REBALANCE,
        inputAsset: tokenA.address,
        outputAsset: tokenB.address,
        amountIn: parseUnits("100", 18),
        minAmountOut: parseUnits("99", 18),
        quotedAmountOut: parseUnits("100", 18),
        deadline: 0,
      },
    ]);

    expect(await router.read.statusOf([1n])).toBe(3);
    expect(await tokenA.read.balanceOf([recipient.account.address])).toBe(parseUnits("100", 18));
  });
});
