import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { deployments, type NetworkKey } from "../../../lib/deployments";

export const dynamic = "force-dynamic";

const rpcUrls: Record<NetworkKey, string> = {
  arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc",
  mantleSepolia: process.env.MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz"
};

const factoryAbi = parseAbi([
  "event CovenantCreated(address indexed owner,address indexed vault,uint256 indexed policyId,address initialExecutor)"
]);

const routerAbi = parseAbi([
  "event ProposalRouted(uint256 indexed proposalId,address indexed vault,address indexed executor,uint8 status)",
  "event QueuedProposalApproved(uint256 indexed proposalId,address indexed approver)"
]);

const receiptAbi = parseAbi([
  "event ReceiptIssued(uint256 indexed proposalId,address indexed vault,address indexed executor,uint8 verdict,uint8 code,string reason)"
]);

export async function GET(request: NextRequest) {
  const network = (request.nextUrl.searchParams.get("network") ?? "arbitrumSepolia") as NetworkKey;
  const deployment = deployments[network];

  if (!deployment) {
    return NextResponse.json({ error: "Unsupported network" }, { status: 400 });
  }

  try {
    const client = createPublicClient({ transport: http(rpcUrls[network]) });
    const fromBlock = BigInt(deployment.startBlock);
    const [created, routed, approved, receipts] = await Promise.all([
      client.getLogs({
        address: deployment.contracts.covenantFactory as `0x${string}`,
        event: factoryAbi[0],
        fromBlock,
        toBlock: "latest"
      }),
      client.getLogs({
        address: deployment.contracts.actionRouter as `0x${string}`,
        event: routerAbi[0],
        fromBlock,
        toBlock: "latest"
      }),
      client.getLogs({
        address: deployment.contracts.actionRouter as `0x${string}`,
        event: routerAbi[1],
        fromBlock,
        toBlock: "latest"
      }),
      client.getLogs({
        address: deployment.contracts.covenantReceipt as `0x${string}`,
        event: receiptAbi[0],
        fromBlock,
        toBlock: "latest"
      })
    ]);

    const events = [
      ...created.map((log) => ({
        type: "covenant.created",
        owner: log.args.owner,
        vault: log.args.vault,
        policyId: log.args.policyId?.toString(),
        executor: log.args.initialExecutor,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex
      })),
      ...routed.map((log) => ({
        type: "proposal.routed",
        proposalId: log.args.proposalId?.toString(),
        vault: log.args.vault,
        executor: log.args.executor,
        status: log.args.status,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex
      })),
      ...approved.map((log) => ({
        type: "proposal.approved",
        proposalId: log.args.proposalId?.toString(),
        approver: log.args.approver,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex
      })),
      ...receipts.map((log) => ({
        type: "receipt.issued",
        proposalId: log.args.proposalId?.toString(),
        vault: log.args.vault,
        executor: log.args.executor,
        verdict: log.args.verdict,
        code: log.args.code,
        reason: log.args.reason,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex
      }))
    ].sort((left, right) => Number(BigInt(left.blockNumber) - BigInt(right.blockNumber)) || left.logIndex - right.logIndex);

    return NextResponse.json({ network, events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to index events" },
      { status: 502 }
    );
  }
}
