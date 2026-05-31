import type { Address, PolicyPreview, PolicyTemplateId } from "../../../../packages/policy/src/index.js";

export interface PassportRecord {
  wallet: Address;
  templateId: PolicyTemplateId;
  preview: PolicyPreview;
  createdAt: string;
  updatedAt: string;
}

export interface PassportRepository {
  save(record: PassportRecord): Promise<PassportRecord>;
  findByWallet(wallet: Address): Promise<PassportRecord | undefined>;
}

export class InMemoryPassportRepository implements PassportRepository {
  readonly #records = new Map<Address, PassportRecord>();

  async save(record: PassportRecord) {
    this.#records.set(record.wallet, record);
    return record;
  }

  async findByWallet(wallet: Address) {
    return this.#records.get(wallet);
  }
}

