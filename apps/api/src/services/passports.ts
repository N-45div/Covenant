import { previewPolicy } from "../../../../packages/policy/src/index.js";
import type { Address, PolicyTemplateId } from "../../../../packages/policy/src/index.js";
import type { PassportRecord, PassportRepository } from "../repositories/passports.js";

export class PassportService {
  constructor(private readonly passports: PassportRepository) {}

  async create(wallet: Address, templateId: PolicyTemplateId): Promise<PassportRecord> {
    const existing = await this.passports.findByWallet(wallet);
    const now = new Date().toISOString();

    return this.passports.save({
      wallet,
      templateId,
      preview: previewPolicy(templateId),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
  }

  async get(wallet: Address) {
    return this.passports.findByWallet(wallet);
  }
}

