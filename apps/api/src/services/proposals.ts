import { randomUUID } from "node:crypto";
import { evaluateProposal } from "../../../../packages/policy/src/validate.js";
import { getPolicyTemplate } from "../../../../packages/policy/src/index.js";
import type { ActionProposalInput } from "../../../../packages/policy/src/validate.js";
import type { Address, PolicyTemplateId } from "../../../../packages/policy/src/index.js";
import type { ProposalRecord, ProposalRepository } from "../repositories/proposals.js";

export class ProposalService {
  constructor(private readonly proposals: ProposalRepository) {}

  async create(wallet: Address, templateId: PolicyTemplateId, proposal: ActionProposalInput): Promise<ProposalRecord> {
    const template = getPolicyTemplate(templateId);

    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }

    const verdict = evaluateProposal(template, proposal);
    const status = verdict.code === "APPROVED"
      ? "approved"
      : verdict.code === "REQUIRES_HUMAN_APPROVAL"
        ? "queued"
        : "rejected";

    return this.proposals.save({
      id: randomUUID(),
      wallet,
      templateId,
      proposal,
      verdict,
      status,
      createdAt: new Date().toISOString()
    });
  }

  async get(id: string) {
    return this.proposals.findById(id);
  }

  async execute(id: string) {
    const record = await this.proposals.findById(id);

    if (!record) return undefined;
    if (record.status !== "approved") return record;

    return this.proposals.save({ ...record, status: "executed" });
  }

  async listByWallet(wallet: Address) {
    return this.proposals.listByWallet(wallet);
  }
}

