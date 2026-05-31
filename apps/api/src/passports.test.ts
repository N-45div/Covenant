import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

const wallet = "0x1111111111111111111111111111111111111111";

describe("passport api", () => {
  it("creates and reads a safety passport", async () => {
    const app = buildServer();
    const created = await app.inject({
      method: "POST",
      url: "/passports",
      payload: {
        wallet,
        templateId: "agent-sandbox"
      }
    });

    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      wallet,
      templateId: "agent-sandbox"
    });

    const fetched = await app.inject({ method: "GET", url: `/passports/${wallet}` });

    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().preview.template.approvalMode).toBe("human");
  });

  it("rejects malformed wallet addresses", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/passports",
      payload: {
        wallet: "not-a-wallet",
        templateId: "agent-sandbox"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("INVALID_PASSPORT");
  });

  it("previews policy templates", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/policies/preview",
      payload: {
        templateId: "high-risk-with-approval"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().warnings.length).toBeGreaterThan(0);
  });
});

