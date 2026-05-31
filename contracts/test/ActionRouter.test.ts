import { describe, expect, it } from "vitest";
import { network } from "hardhat";
import { getAddress, parseUnits, zeroAddress } from "viem";

const REBALANCE = "0x7265626c";

describe("ActionRouter", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [owner, executor, recipient, outsider] = await viem.getWalletClients();

  async function deployCovenant() {
    const engine = await viem.deployContract("PolicyEngine");
    const receipt = await viem.deployContract("CovenantReceipt", [zeroAddress]);
    const router = await viem.deployContract("ActionRouter", [engine.address, receipt.address]);
    await receipt.write.setRouter([router.address]);

    const tokenA = await viem.deployContract("MockToken", ["Tokenized USD", "tUSD"]);
    const tokenB = await viem.deployContract("MockToken", ["Tokenized Bill", "tBILL"]);
    const now = await publicClient.getBlock({ blockTag: "latest" }).then((block) => block.timestamp);

    await engine.write.createPolicy([
      [tokenA.address],
      [tokenB.address],
      [{ action: REBALANCE, amountCap: parseUnits("1000", 18) }],
      9_800,
      Number(now + 3_600n),
      0,
      parseUnits("500", 18),
    ]);
    await engine.write.setExecutionRecorder([1n, router.address, true]);

    const vault = await viem.deployContract("CovenantVault", [
      owner.account.address,
      router.address,
      1n,
      executor.account.address,
    ]);
    await tokenA.write.mint([owner.account.address, parseUnits("2000", 18)]);
    await tokenA.write.approve([vault.address, parseUnits("2000", 18)]);
    await vault.write.deposit([tokenA.address, parseUnits("2000", 18)]);

    return { engine, receipt, router, vault, tokenA, tokenB, owner, executor, recipient, outsider };
  }

  function action(ctx: Awaited<ReturnType<typeof deployCovenant>>, overrides = {}) {
    return {
      actor: getAddress(ctx.executor.account.address),
      action: REBALANCE,
      inputAsset: ctx.tokenA.address,
      outputAsset: ctx.tokenB.address,
      amountIn: parseUnits("100", 18),
      minAmountOut: parseUnits("99", 18),
      quotedAmountOut: parseUnits("100", 18),
      deadline: 0,
      ...overrides,
    };
  }

  it("executes approved routed actions from authorized executors", async () => {
    const ctx = await deployCovenant();
    const routerAsExecutor = await viem.getContractAt("ActionRouter", ctx.router.address, {
      client: { wallet: executor },
    });

    await routerAsExecutor.write.propose([ctx.vault.address, recipient.account.address, action(ctx)]);

    expect(await ctx.router.read.statusOf([1n])).toBe(3);
    expect(await ctx.tokenA.read.balanceOf([recipient.account.address])).toBe(parseUnits("100", 18));
  });

  it("rejects unauthorized executors before policy evaluation", async () => {
    const ctx = await deployCovenant();
    const routerAsOutsider = await viem.getContractAt("ActionRouter", ctx.router.address, {
      client: { wallet: outsider },
    });

    await expect(
      routerAsOutsider.write.propose([ctx.vault.address, recipient.account.address, action(ctx)])
    ).rejects.toThrow();
  });

  it("queues threshold-crossing actions for owner approval", async () => {
    const ctx = await deployCovenant();
    const routerAsExecutor = await viem.getContractAt("ActionRouter", ctx.router.address, {
      client: { wallet: executor },
    });

    await routerAsExecutor.write.propose([
      ctx.vault.address,
      recipient.account.address,
      action(ctx, { amountIn: parseUnits("500", 18) }),
    ]);

    expect(await ctx.router.read.statusOf([1n])).toBe(2);
    expect(await ctx.tokenA.read.balanceOf([recipient.account.address])).toBe(0n);

    await ctx.router.write.approveQueued([1n]);

    expect(await ctx.router.read.statusOf([1n])).toBe(3);
    expect(await ctx.tokenA.read.balanceOf([recipient.account.address])).toBe(parseUnits("500", 18));
  });

  it("stores rejected proposals without moving funds", async () => {
    const ctx = await deployCovenant();
    const routerAsExecutor = await viem.getContractAt("ActionRouter", ctx.router.address, {
      client: { wallet: executor },
    });

    await routerAsExecutor.write.propose([
      ctx.vault.address,
      recipient.account.address,
      action(ctx, { amountIn: parseUnits("1001", 18) }),
    ]);

    expect(await ctx.router.read.statusOf([1n])).toBe(1);
    expect(await ctx.tokenA.read.balanceOf([recipient.account.address])).toBe(0n);
  });
});
