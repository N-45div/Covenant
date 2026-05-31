import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("covenant api", () => {
  it("reports health", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: "covenant-api"
    });
  });

  it("exposes chain deployments", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/deployments" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.deployments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ chainKey: "arbitrum-sepolia", chainId: 421614 }),
        expect.objectContaining({ chainKey: "robinhood-testnet", chainId: 46630 })
      ])
    );
  });

  it("exposes scored policy templates", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/templates" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.templates.length).toBeGreaterThanOrEqual(5);
    expect(body.templates[0]).toHaveProperty("safetyScore");
    expect(body.templates[0]).toHaveProperty("warnings");
  });
});

