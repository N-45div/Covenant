import Fastify from "fastify";
import { registerSystemRoutes } from "./routes/system.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  void app.register(registerSystemRoutes);

  return app;
}

const isEntrypoint = process.argv[1]?.endsWith("server.ts");

if (isEntrypoint) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";

  await buildServer().listen({ port, host });
}
