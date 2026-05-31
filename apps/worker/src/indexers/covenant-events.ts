import { getAddress, parseAbi, type Address, type PublicClient } from "viem";
import type { CovenantDeployment } from "../../../../contracts/scripts/deploy-lib.js";

export type CovenantEventType =
  | "covenant.created"
  | "proposal.routed"
  | "proposal.approved"
  | "receipt.issued";

export interface CovenantIndexedEvent {
  type: CovenantEventType;
  proposalId?: string;
  policyId?: string;
  vault?: Address;
  owner?: Address;
  executor?: Address;
  approver?: Address;
  verdict?: number;
  code?: number;
  status?: number;
  reason?: string;
  transactionHash: `0x${string}`;
  blockNumber: string;
  logIndex: number;
}

export interface CovenantIndexRange {
  fromBlock?: bigint;
  toBlock?: bigint | "latest";
}

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

export async function indexCovenantEvents(
  client: PublicClient,
  deployment: CovenantDeployment,
  range: CovenantIndexRange = {}
): Promise<CovenantIndexedEvent[]> {
  const fromBlock = range.fromBlock ?? 0n;
  const toBlock = range.toBlock ?? "latest";
  const [created, routed, approved, receipts] = await Promise.all([
    client.getLogs({
      address: deployment.contracts.covenantFactory,
      event: factoryAbi[0],
      fromBlock,
      toBlock
    }),
    client.getLogs({
      address: deployment.contracts.actionRouter,
      event: routerAbi[0],
      fromBlock,
      toBlock
    }),
    client.getLogs({
      address: deployment.contracts.actionRouter,
      event: routerAbi[1],
      fromBlock,
      toBlock
    }),
    client.getLogs({
      address: deployment.contracts.covenantReceipt,
      event: receiptAbi[0],
      fromBlock,
      toBlock
    })
  ]);

  return [
    ...created.map((log) => ({
      type: "covenant.created" as const,
      owner: normalizeAddress(log.args.owner),
      vault: normalizeAddress(log.args.vault),
      policyId: requiredBigInt(log.args.policyId).toString(),
      executor: normalizeAddress(log.args.initialExecutor),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      logIndex: log.logIndex
    })),
    ...routed.map((log) => ({
      type: "proposal.routed" as const,
      proposalId: requiredBigInt(log.args.proposalId).toString(),
      vault: normalizeAddress(log.args.vault),
      executor: normalizeAddress(log.args.executor),
      status: requiredNumber(log.args.status),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      logIndex: log.logIndex
    })),
    ...approved.map((log) => ({
      type: "proposal.approved" as const,
      proposalId: requiredBigInt(log.args.proposalId).toString(),
      approver: normalizeAddress(log.args.approver),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      logIndex: log.logIndex
    })),
    ...receipts.map((log) => ({
      type: "receipt.issued" as const,
      proposalId: requiredBigInt(log.args.proposalId).toString(),
      vault: normalizeAddress(log.args.vault),
      executor: normalizeAddress(log.args.executor),
      verdict: requiredNumber(log.args.verdict),
      code: requiredNumber(log.args.code),
      reason: requiredString(log.args.reason),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      logIndex: log.logIndex
    }))
  ].sort(compareEvents);
}

function normalizeAddress(value: Address | undefined) {
  if (!value) throw new Error("Missing indexed address in event log");
  return getAddress(value);
}

function requiredBigInt(value: bigint | undefined) {
  if (value === undefined) throw new Error("Missing bigint in event log");
  return value;
}

function requiredNumber(value: number | undefined) {
  if (value === undefined) throw new Error("Missing numeric enum in event log");
  return value;
}

function requiredString(value: string | undefined) {
  if (value === undefined) throw new Error("Missing string in event log");
  return value;
}

function compareEvents(left: CovenantIndexedEvent, right: CovenantIndexedEvent) {
  const blockDelta = BigInt(left.blockNumber) - BigInt(right.blockNumber);
  if (blockDelta < 0n) return -1;
  if (blockDelta > 0n) return 1;
  return left.logIndex - right.logIndex;
}

export function eventsForVault(events: CovenantIndexedEvent[], vault: Address) {
  const target = getAddress(vault);
  return events.filter((event) => event.vault && getAddress(event.vault) === target);
}

export function receiptForProposal(events: CovenantIndexedEvent[], proposalId: string) {
  return events.find((event) => event.type === "receipt.issued" && event.proposalId === proposalId);
}
