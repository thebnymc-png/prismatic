import { json, fail, requireAuth } from "../_lib/util.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return fail(401, "Not signed in.");
  let s = { total: 0, recent: [] };
  if (env.CONTENT) { try { s = (await env.CONTENT.get("stats:contact", "json")) || s; } catch {} }
  return json({ ok: true, total: s.total || 0, recent: (s.recent || []).slice(0, 20) });
}
