import Fastify from "fastify";
import { registerPassportRoutes } from "./routes/passports.js";
import { registerProposalRoutes } from "./routes/proposals.js";
import { registerSystemRoutes } from "./routes/system.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  void app.register(registerSystemRoutes);
  void app.register(registerPassportRoutes);
  void app.register(registerProposalRoutes);

  return app;
}

const isEntrypoint = process.argv[1]?.endsWith("server.ts");

if (isEntrypoint) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";

  await buildServer().listen({ port, host });
}
