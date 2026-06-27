import http from "node:http";
import { runPolicyVarianceAgent } from "./policy-variance-agent.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function sendJson(res, payload, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...corsHeaders
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, {
        status: "ok",
        service: "covenant-render-agent",
        runtime: "node",
        framework: "Mastra",
        external_agents: ["policy-variance"],
        llm_configured: Boolean(process.env.OPENROUTER_API_KEY)
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/external-agents/policy-variance") {
      const body = await readJson(req);
      const result = await runPolicyVarianceAgent(body, {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL,
        enabled: Boolean(process.env.OPENROUTER_API_KEY)
      });
      sendJson(res, result);
      return;
    }

    sendJson(res, { error: "not_found", path: url.pathname }, 404);
  } catch (error) {
    sendJson(
      res,
      {
        error: "internal_error",
        detail: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
});

const port = Number(process.env.PORT ?? 10000);

server.listen(port, () => {
  console.log(`Covenant Render agent listening on port ${port}`);
});
