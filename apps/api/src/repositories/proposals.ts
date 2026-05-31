import type { ActionProposalInput, PolicyVerdict } from "../../../../packages/policy/src/validate.js";
import type { Address, PolicyTemplateId } from "../../../../packages/policy/src/index.js";

export interface ProposalRecord {
  id: string;
  wallet: Address;
  templateId: PolicyTemplateId;
  proposal: ActionProposalInput;
  verdict: PolicyVerdict;
  status: "approved" | "rejected" | "queued" | "executed";
  createdAt: string;
}

export interface ProposalRepository {
  save(record: ProposalRecord): Promise<ProposalRecord>;
  findById(id: string): Promise<ProposalRecord | undefined>;
  listByWallet(wallet: Address): Promise<ProposalRecord[]>;
}

export class InMemoryProposalRepository implements ProposalRepository {
  readonly #records = new Map<string, ProposalRecord>();

  async save(record: ProposalRecord) {
    this.#records.set(record.id, record);
    return record;
  }

  async findById(id: string) {
    return this.#records.get(id);
  }

  async listByWallet(wallet: Address) {
    return [...this.#records.values()].filter((record) => record.wallet === wallet);
  }
}

