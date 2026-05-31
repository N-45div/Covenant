import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

const wallet = "0x1111111111111111111111111111111111111111";
const venue = "0x0000000000000000000000000000000000000100";
const usdc = "0x0000000000000000000000000000000000000001";
const tbill = "0x0000000000000000000000000000000000000002";

function proposal(overrides = {}) {
  return {
    wallet,
    templateId: "tokenized-asset-basket",
    proposal: {
      proposer: wallet,
      executor: wallet,
      inputAsset: usdc,
      outputAsset: tbill,
      amountIn: "100000000",
      minAmountOut: "99000000",
      quotedAmountOut: "100000000",
      deadline: 0,
      venue,
      actionType: "rebalance",
      ...overrides
    }
  };
}

describe("proposal api", () => {
  it("approves and executes safe proposals", async () => {
    const app = buildServer();
    const created = await app.inject({ method: "POST", url: "/proposals", payload: proposal() });
    const body = created.json();

    expect(created.statusCode).toBe(200);
    expect(body.status).toBe("approved");
    expect(body.verdict.code).toBe("APPROVED");

    const executed = await app.inject({ method: "POST", url: `/proposals/${body.id}/execute` });
    expect(executed.statusCode).toBe(200);
    expect(executed.json().status).toBe("executed");
  });

  it("rejects unsafe asset proposals with explicit verdicts", async () => {
    const app = buildServer();
    const created = await app.inject({
      method: "POST",
      url: "/proposals",
      payload: proposal({ outputAsset: "0x0000000000000000000000000000000000000999" })
    });

    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      status: "rejected",
      verdict: { code: "REJECTED_ASSET_NOT_ALLOWED" }
    });
  });
});

