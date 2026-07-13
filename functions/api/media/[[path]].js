export async function onRequestGet({ params, env }) {
  if (!env.MEDIA) return new Response("Not found", { status: 404 });
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!/^[a-f0-9]{8,}\.(jpg|jpeg|png|webp)$/i.test(key)) return new Response("Not found", { status: 404 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  h.set("content-type", obj.httpMetadata?.contentType || "application/octet-stream");
  h.set("cache-control", "public, max-age=31536000, immutable"); // keys are unique
  h.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers: h });
}
