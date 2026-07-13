import { json, ok, fail, requireAuth, sanitizeContent, seedContent, CONTENT_KEY } from "../_lib/util.js";

export async function onRequestGet({ env }) {
  let data = null;
  if (env.CONTENT) { try { data = await env.CONTENT.get(CONTENT_KEY, "json"); } catch {} }
  return json(data || seedContent(), { headers: { "cache-control": "no-store" } });
}

export async function onRequestPut({ request, env }) {
  if (!(await requireAuth(request, env))) return fail(401, "Not signed in.");
  if (!env.CONTENT) return fail(500, "Content store not configured.");
  let body;
  try { body = await request.json(); } catch { return fail(400, "Invalid JSON."); }
  const clean = sanitizeContent(body);
  await env.CONTENT.put(CONTENT_KEY, JSON.stringify(clean));
  return ok({ content: clean });
}
