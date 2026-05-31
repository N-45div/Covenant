import { describe, expect, it } from "vitest";
import { network } from "hardhat";
import { getAddress, parseUnits } from "viem";
import { deployCovenantStack } from "../../../../contracts/scripts/deploy-lib.js";
import { eventsForVault, indexCovenantEvents, receiptForProposal } from "./covenant-events.js";

const REBALANCE = "0x7265626c";

describe("covenant event indexer", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  it("indexes creation, routed proposal, and receipt events from chain logs", async () => {
    const deployment = await deployCovenantStack(viem, "hardhat");
    const wallets = await viem.getWalletClients();
    const executor = wallets.find(
      (wallet) => getAddress(wallet.account.address) === getAddress(deployment.demo.authorizedExecutor)
    );
    if (!executor) throw new Error("Missing authorized executor wallet");
    const router = await viem.getContractAt("ActionRouter", deployment.contracts.actionRouter, {
      client: { wallet: executor },
    });

    const tx = await router.write.propose([
      deployment.contracts.covenantVault,
      executor.account.address,
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
    await publicClient.waitForTransactionReceipt({ hash: tx });

    const events = await indexCovenantEvents(publicClient, deployment, { fromBlock: 0n });
    const timeline = eventsForVault(events, deployment.contracts.covenantVault);
    const receipt = receiptForProposal(events, "1");

    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["covenant.created", "proposal.routed", "receipt.issued"])
    );
    expect(timeline.length).toBeGreaterThanOrEqual(3);
    expect(receipt).toMatchObject({
      type: "receipt.issued",
      proposalId: "1",
      verdict: 0,
      code: 0,
      reason: "APPROVED"
    });
  });
});
