import { describe, expect, it } from "vitest";
import { network } from "hardhat";
import { getAddress, parseUnits, zeroAddress } from "viem";

const REBALANCE = "0x7265626c";
const BORROW = "0x626f7272";

const tokenA = getAddress("0x00000000000000000000000000000000000000a1");
const tokenB = getAddress("0x00000000000000000000000000000000000000b2");
const tokenC = getAddress("0x00000000000000000000000000000000000000c3");

interface Decision {
  verdict: number;
  code: number;
  reason: string;
}

describe("PolicyEngine", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  async function deployPolicy() {
    const engine = await viem.deployContract("PolicyEngine");
    const now = await publicClient.getBlock({ blockTag: "latest" }).then((block) => block.timestamp);
    const receipt = await engine.write.createPolicy([
      [tokenA],
      [tokenB],
      [
        { action: REBALANCE, amountCap: parseUnits("1000", 18) },
        { action: BORROW, amountCap: parseUnits("250", 18) },
      ],
      9_800,
      Number(now + 3_600n),
      300,
      parseUnits("500", 18),
    ]);

    await publicClient.waitForTransactionReceipt({ hash: receipt });
    return engine;
  }

  function proposal(overrides = {}) {
    return {
      actor: getAddress("0x0000000000000000000000000000000000000a11"),
      action: REBALANCE,
      inputAsset: tokenA,
      outputAsset: tokenB,
      amountIn: parseUnits("100", 18),
      minAmountOut: parseUnits("99", 18),
      quotedAmountOut: parseUnits("100", 18),
      deadline: 0,
      ...overrides,
    };
  }

  it("approves a proposal inside asset, cap, expiry, cooldown, and slippage policy", async () => {
    const engine = await deployPolicy();
    const decision = (await engine.read.validate([1n, proposal()])) as Decision;

    expect(decision.verdict).toBe(0);
    expect(decision.code).toBe(0);
    expect(decision.reason).toBe("APPROVED");
  });

  it("rejects explicit policy violations with machine-readable reasons", async () => {
    const engine = await deployPolicy();

    await expect(engine.read.validate([1n, proposal({ inputAsset: tokenC })])).resolves.toMatchObject({
      verdict: 1,
      code: 5,
      reason: "INPUT_ASSET_NOT_ALLOWED",
    });
    await expect(engine.read.validate([1n, proposal({ amountIn: parseUnits("1001", 18) })])).resolves.toMatchObject({
      verdict: 1,
      code: 7,
      reason: "AMOUNT_CAP_EXCEEDED",
    });
    await expect(engine.read.validate([1n, proposal({ minAmountOut: parseUnits("97", 18) })])).resolves.toMatchObject({
      verdict: 1,
      code: 8,
      reason: "SLIPPAGE_TOO_HIGH",
    });
  });

  it("requires human approval at or above the policy threshold", async () => {
    const engine = await deployPolicy();
    const decision = (await engine.read.validate([1n, proposal({ amountIn: parseUnits("500", 18) })])) as Decision;

    expect(decision.verdict).toBe(2);
    expect(decision.code).toBe(9);
    expect(decision.reason).toBe("HUMAN_APPROVAL_REQUIRED");
  });

  it("records approved execution and then enforces cooldown", async () => {
    const engine = await deployPolicy();
    await engine.write.recordExecution([1n, proposal()]);

    const decision = (await engine.read.validate([1n, proposal()])) as Decision;
    expect(decision.verdict).toBe(1);
    expect(decision.code).toBe(4);
    expect(decision.reason).toBe("COOLDOWN_ACTIVE");
  });

  it("rejects expired proposals and invalid policy shape", async () => {
    const engine = await deployPolicy();
    const now = await publicClient.getBlock({ blockTag: "latest" }).then((block) => block.timestamp);

    await expect(engine.read.validate([1n, proposal({ deadline: Number(now - 1n) })])).resolves.toMatchObject({
      verdict: 1,
      code: 3,
      reason: "PROPOSAL_EXPIRED",
    });
    await expect(
      engine.write.createPolicy([[zeroAddress], [tokenB], [{ action: REBALANCE, amountCap: 1n }], 10_000, 0, 0, 0]),
    ).rejects.toThrow();
  });
});
