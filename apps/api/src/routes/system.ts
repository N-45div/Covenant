import type { FastifyInstance } from "fastify";
import { deployments } from "../config/deployments.js";
import { policyTemplates, previewPolicy } from "../../../../packages/policy/src/index.js";

export async function registerSystemRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "covenant-api",
    version: "0.1.0"
  }));

  app.get("/deployments", async () => ({
    deployments
  }));

  app.get("/templates", async () => ({
    templates: policyTemplates.map((template) => previewPolicy(template.id))
  }));
}

