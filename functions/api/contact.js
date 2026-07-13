import { ok, fail } from "../_lib/util.js";

const STATS_KEY = "stats:contact";
const MAX_TS = 50;          // keep only the most recent 50 timestamps
const RL_WINDOW = 60;       // simple anti-spam: max 3 per minute per IP
const RL_MAX = 3;

export async function onRequestPost({ request, env }) {
  const ct = (request.headers.get("content-type") || "");
  let data = {};
  try {
    data = ct.includes("application/json") ? await request.json()
         : Object.fromEntries((await request.formData()).entries());
  } catch { return fail(400, "Bad request."); }

  // Honeypot: silently accept bots without forwarding/counting.
  if (data.botcheck || data._gotcha) return ok({ skipped: true });

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.CONTENT) {
    try {
      const rl = await env.CONTENT.get(`crl:${ip}`, "json");
      if (rl && rl.n >= RL_MAX && Date.now() - rl.t < RL_WINDOW * 1000)
        return fail(429, "Please wait a moment before sending again.");
    } catch {}
  }

  // Forward the enquiry to Web3Forms (email delivery). The message content is
  // NOT stored anywhere on our side.
  let delivered = false;
  const key = env.WEB3FORMS_KEY || data.access_key;
  if (key) {
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ ...data, access_key: key }),
      });
      delivered = r.ok;
    } catch { delivered = false; }
  }

  // Count + timestamp only (privacy-safe: no name, email, or message kept).
  if (env.CONTENT) {
    try {
      const s = (await env.CONTENT.get(STATS_KEY, "json")) || { total: 0, recent: [] };
      s.total = (s.total || 0) + 1;
      s.recent = [Date.now(), ...(s.recent || [])].slice(0, MAX_TS);
      await env.CONTENT.put(STATS_KEY, JSON.stringify(s));
      const rl = await env.CONTENT.get(`crl:${ip}`, "json");
      const n = rl && Date.now() - rl.t < RL_WINDOW * 1000 ? rl.n + 1 : 1;
      await env.CONTENT.put(`crl:${ip}`, JSON.stringify({ n, t: Date.now() }), { expirationTtl: RL_WINDOW });
    } catch {}
  }

  if (!delivered) return fail(502, "Could not send right now. Please email or call us.");
  return ok({ delivered: true });
}
