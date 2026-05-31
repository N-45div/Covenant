import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { InMemoryProposalRepository } from "../repositories/proposals.js";
import { ProposalService } from "../services/proposals.js";
import { addressSchema, policyTemplateIdSchema } from "../schemas/common.js";

const proposalSchema = z.object({
  wallet: addressSchema,
  templateId: policyTemplateIdSchema,
  proposal: z.object({
    proposer: addressSchema,
    executor: addressSchema,
    inputAsset: addressSchema,
    outputAsset: addressSchema,
    amountIn: z.string().regex(/^[0-9]+$/),
    minAmountOut: z.string().regex(/^[0-9]+$/),
    quotedAmountOut: z.string().regex(/^[0-9]+$/),
    deadline: z.number().int().nonnegative(),
    venue: addressSchema,
    actionType: z.string().min(1).max(64),
    metadataHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]+$/)
      .transform((value) => value as `0x${string}`)
      .optional()
  })
});

export async function registerProposalRoutes(app: FastifyInstance) {
  const service = new ProposalService(new InMemoryProposalRepository());

  app.post("/proposals", async (request, reply) => {
    const parsed = proposalSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_PROPOSAL", issues: parsed.error.issues });
    }

    return service.create(parsed.data.wallet, parsed.data.templateId, parsed.data.proposal);
  });

  app.get("/proposals/:id", async (request, reply) => {
    const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_PROPOSAL_ID", issues: parsed.error.issues });
    }

    const proposal = await service.get(parsed.data.id);
    return proposal ?? reply.code(404).send({ error: "PROPOSAL_NOT_FOUND" });
  });

  app.post("/proposals/:id/execute", async (request, reply) => {
    const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_PROPOSAL_ID", issues: parsed.error.issues });
    }

    const proposal = await service.execute(parsed.data.id);

    if (!proposal) {
      return reply.code(404).send({ error: "PROPOSAL_NOT_FOUND" });
    }

    if (proposal.status !== "executed") {
      return reply.code(409).send({ error: "PROPOSAL_NOT_EXECUTABLE", proposal });
    }

    return proposal;
  });
}
