import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { previewPolicy } from "../../../../packages/policy/src/index.js";
import { InMemoryPassportRepository } from "../repositories/passports.js";
import { PassportService } from "../services/passports.js";
import { addressSchema, policyTemplateIdSchema } from "../schemas/common.js";

const createPassportSchema = z.object({
  wallet: addressSchema,
  templateId: policyTemplateIdSchema.default("tokenized-asset-basket")
});

const previewSchema = z.object({
  templateId: policyTemplateIdSchema
});

export async function registerPassportRoutes(app: FastifyInstance) {
  const service = new PassportService(new InMemoryPassportRepository());

  app.post("/passports", async (request, reply) => {
    const parsed = createPassportSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_PASSPORT", issues: parsed.error.issues });
    }

    return service.create(parsed.data.wallet, parsed.data.templateId);
  });

  app.get("/passports/:wallet", async (request, reply) => {
    const params = z.object({ wallet: addressSchema }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: "INVALID_WALLET", issues: params.error.issues });
    }

    const passport = await service.get(params.data.wallet);

    if (!passport) {
      return reply.code(404).send({ error: "PASSPORT_NOT_FOUND" });
    }

    return passport;
  });

  app.post("/policies/preview", async (request, reply) => {
    const parsed = previewSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_POLICY_PREVIEW", issues: parsed.error.issues });
    }

    return previewPolicy(parsed.data.templateId);
  });
}

