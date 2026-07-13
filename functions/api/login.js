import { ok, fail, timingSafeEqual, makeToken, sessionCookie } from "../_lib/util.js";

const MAX_ATTEMPTS = 6, WINDOW = 900; // 6 tries per 15 min per IP

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PIN) return fail(500, "Admin PIN not configured.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rlKey = `rl:${ip}`;

  let rl = null;
  if (env.CONTENT) { try { rl = await env.CONTENT.get(rlKey, "json"); } catch {} }
  if (rl && rl.n >= MAX_ATTEMPTS && Date.now() - rl.t < WINDOW * 1000) {
    return fail(429, "Too many attempts. Try again later.");
  }

  let pin = "";
  try { pin = (await request.json())?.pin || ""; } catch {}

  if (!timingSafeEqual(String(pin), String(env.ADMIN_PIN))) {
    if (env.CONTENT) {
      const n = rl && Date.now() - rl.t < WINDOW * 1000 ? rl.n + 1 : 1;
      try { await env.CONTENT.put(rlKey, JSON.stringify({ n, t: Date.now() }), { expirationTtl: WINDOW }); } catch {}
    }
    return fail(401, "Incorrect PIN.");
  }

  if (env.CONTENT) { try { await env.CONTENT.delete(rlKey); } catch {} }
  const token = await makeToken(env);
  return ok({}, { headers: { "Set-Cookie": sessionCookie(token) } });
}
