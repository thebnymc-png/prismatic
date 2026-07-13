import { ok, fail, requireAuth } from "../_lib/util.js";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return fail(401, "Not signed in.");
  if (!env.MEDIA) return fail(500, "Media store not configured.");

  const type = (request.headers.get("content-type") || "").split(";")[0].trim();
  const ext = EXT[type];
  if (!ext) return fail(415, "Only JP, PNG or WebP images are allowed.");

  const cl = Number(request.headers.get("content-length") || 0);
  if (cl && cl > MAX_BYTES) return fail(413, "Image too large (5MB max).");

  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return fail(400, "Empty upload.");
  if (buf.byteLength > MAX_BYTES) return fail(413, "Image too large (5MB max).");

  const key = `${crypto.randomUUID().replace(/-/g, "")}.${ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: type } });
  return ok({ key });
}
