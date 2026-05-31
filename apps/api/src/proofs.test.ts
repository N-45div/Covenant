import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";
import deployment from "../../../deployments/arbitrumSepolia.json" with { type: "json" };

describe("proof api", () => {
  it("serves deployment artifacts", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/deployments/arbitrumSepolia" });

    expect(response.statusCode).toBe(200);
    expect(response.json().contracts.actionRouter).toBe(deployment.contracts.actionRouter);
  });

  it("rejects missing deployment networks", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/deployments/mantleSepolia" });

    expect(response.statusCode).toBe(404);
  });
});

