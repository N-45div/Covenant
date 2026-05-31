import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { network } from "hardhat";
import { getAddress, isAddress, parseUnits } from "viem";
import { deployCovenantStack } from "../scripts/deploy-lib.js";

const REBALANCE = "0x7265626c";

describe("deployment smoke", async () => {
  const { viem } = await network.create();

  it("deploys the full Covenant stack and writes a reusable artifact", async () => {
    const dir = await mkdtemp(join(tmpdir(), "covenant-deploy-"));
    const outputPath = join(dir, "hardhat.json");

    try {
      const deployment = await deployCovenantStack(viem, "hardhat", outputPath);
      const artifact = JSON.parse(await readFile(outputPath, "utf8"));

      expect(artifact).toMatchObject({
        network: "hardhat",
        policyId: "1",
        contracts: deployment.contracts,
      });
      expect(Object.values(artifact.contracts).every((address) => isAddress(address as string))).toBe(true);

      const router = await viem.getContractAt("ActionRouter", deployment.contracts.actionRouter);
      const token = await viem.getContractAt("MockToken", deployment.contracts.demoInputToken);
      const [, executor, recipient] = await viem.getWalletClients();
      const routerAsExecutor = await viem.getContractAt("ActionRouter", router.address, {
        client: { wallet: executor },
      });

      await routerAsExecutor.write.propose([
        deployment.contracts.covenantVault,
        recipient.account.address,
        {
          actor: getAddress(executor.account.address),
          action: REBALANCE,
          inputAsset: deployment.contracts.demoInputToken,
          outputAsset: deployment.contracts.demoOutputToken,
          amountIn: parseUnits("100", 18),
          minAmountOut: parseUnits("99", 18),
          quotedAmountOut: parseUnits("100", 18),
          deadline: 0,
        },
      ]);

      expect(await router.read.statusOf([1n])).toBe(3);
      expect(await token.read.balanceOf([recipient.account.address])).toBe(parseUnits("100", 18));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

