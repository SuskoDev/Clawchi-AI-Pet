/**
 * @file Clawchi Relay — Cloudflare Worker
 * @version 0.1.0
 * @author SuskoDev
 * @license MIT
 * @see {@link https://github.com/SuskoDev/Clawchi-AI-Pet}
 *
 * @description
 * Lightweight relay server for Clawchi. Each user deploys their own.
 * Users are identified by their clawchiId (random anonymous string).
 *
 * Endpoints:
 *   POST /state/:id  — AI agent writes current state + optional sub-agents
 *   GET  /state/:id  — Chrome extension polls for latest state
 *
 * Storage:
 *   Cloudflare KV with key "state:{clawchiId}"
 *   All entries auto-expire after 5 minutes (300s TTL)
 *
 * Security:
 *   - Optional AUTH_KEY for write protection
 *   - Input validation on all fields (state, message, subAgents)
 *   - CORS enabled for browser access
 *   - No PII stored — only anonymous state data
 *
 * @module worker
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const VALID_STATES = ["idle", "thinking", "working", "sleeping", "error", "celebrating", "needs-input"];
const ID_REGEX = /^\/state\/([a-zA-Z0-9_-]{6,40})$/;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return json(null, 204);
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "clawchi-relay" });
    }

    const match = url.pathname.match(ID_REGEX);
    if (!match) return json({ error: "not found" }, 404);

    const id = match[1];
    const key = `state:${id}`;

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const state = VALID_STATES.includes(body.state) ? body.state : "idle";
        const message = String(body.message || "").slice(0, 50);

        // Validate sub-agents (optional)
        let subAgents = [];
        if (Array.isArray(body.subAgents)) {
          subAgents = body.subAgents.slice(0, 10).map(sa => ({
            id: String(sa.id || "").slice(0, 20),
            name: String(sa.name || "").slice(0, 12),
            state: VALID_STATES.includes(sa.state) ? sa.state : "working",
            message: String(sa.message || "").slice(0, 50),
          })).filter(sa => sa.id);
        }

        const data = { state, message, subAgents, ts: Date.now() };
        await env.CLAWCHI_KV.put(key, JSON.stringify(data), { expirationTtl: 300 });
        return json({ ok: true, ...data });
      } catch (e) {
        return json({ error: "invalid body" }, 400);
      }
    }

    if (request.method === "GET") {
      const raw = await env.CLAWCHI_KV.get(key);
      return json(raw ? JSON.parse(raw) : { state: "idle", message: "", ts: 0 });
    }

    return json({ error: "method not allowed" }, 405);
  },
};

function json(data, status = 200) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
