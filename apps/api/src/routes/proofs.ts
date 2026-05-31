import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addressSchema } from "../schemas/common.js";
import { ChainProofService } from "../services/chainProofs.js";

const networkSchema = z.enum(["arbitrumSepolia", "mantleSepolia"]);

export async function registerProofRoutes(app: FastifyInstance) {
  const proofs = new ChainProofService();

  app.get("/deployments/:network", async (request, reply) => {
    const parsed = z.object({ network: networkSchema }).safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_NETWORK", issues: parsed.error.issues });
    }

    const deployment = await proofs.deployment(parsed.data.network);
    if (!deployment) {
      return reply.code(404).send({ error: "DEPLOYMENT_NOT_FOUND" });
    }

    return deployment;
  });

  app.get("/receipts/:proposalId", async (request, reply) => {
    const parsed = z.object({
      proposalId: z.string().regex(/^[0-9]+$/),
      network: networkSchema.default("arbitrumSepolia")
    }).safeParse({ ...asRecord(request.params), ...asRecord(request.query) });

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_RECEIPT_QUERY", issues: parsed.error.issues });
    }

    const receipt = await proofs.receipt(parsed.data.network, parsed.data.proposalId);
    if (!receipt) {
      return reply.code(404).send({ error: "RECEIPT_NOT_FOUND" });
    }

    return receipt;
  });

  app.get("/vaults/:address/timeline", async (request, reply) => {
    const parsed = z.object({
      address: addressSchema,
      network: networkSchema.default("arbitrumSepolia")
    }).safeParse({ ...asRecord(request.params), ...asRecord(request.query) });

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_TIMELINE_QUERY", issues: parsed.error.issues });
    }

    return {
      network: parsed.data.network,
      vault: parsed.data.address,
      events: await proofs.timeline(parsed.data.network, parsed.data.address)
    };
  });
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
