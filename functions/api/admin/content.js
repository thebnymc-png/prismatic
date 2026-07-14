import { ok, fail, requireAccess, sanitizeContent, CONTENT_KEY } from "../../_lib/util.js";

export async function onRequestPut({ request, env }) {
  if (!(await requireAccess(request, env))) return fail(401, "Not signed in.");
  if (!env.CONTENT) return fail(500, "Content store not configured.");
  let body;
  try { body = await request.json(); } catch { return fail(400, "Invalid JSON."); }
  const clean = sanitizeContent(body);
  await env.CONTENT.put(CONTENT_KEY, JSON.stringify(clean));
  return ok({ content: clean });
}
