import { json, ok, fail, requireAccess, sanitizePost } from "../../../_lib/util.js";
const INDEX = "posts:index";

export async function onRequestPut({ params, request, env }) {
  if (!(await requireAccess(request, env))) return fail(401, "Not signed in.");
  const id = String(params.id || "");
  let cur = null;
  try { cur = await env.CONTENT.get("post:" + id, "json"); } catch {}
  if (!cur) return fail(404, "Not found.");
  let input;
  try { input = await request.json(); } catch { return fail(400, "Invalid JSON."); }
  const clean = sanitizePost(input);
  if (!clean.title) return fail(400, "A title is required.");
  const post = { ...cur, ...clean, slug: cur.slug, updated: Date.now() };
  await env.CONTENT.put("post:" + id, JSON.stringify(post));
  let idx = [];
  try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
  idx = idx.map(p => p.id === id ? { id, slug: post.slug, title: post.title, date: post.date, image: post.image, excerpt: post.excerpt, published: post.published, areas: post.areas || [] } : p);
  await env.CONTENT.put(INDEX, JSON.stringify(idx));
  return ok({ post });
}

export async function onRequestDelete({ params, request, env }) {
  if (!(await requireAccess(request, env))) return fail(401, "Not signed in.");
  const id = String(params.id || "");
  let idx = [];
  try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
  await env.CONTENT.put(INDEX, JSON.stringify(idx.filter(p => p.id !== id)));
  try { await env.CONTENT.delete("post:" + id); } catch {}
  return ok({ deleted: true });
}

export async function onRequestGet({ params, request, env }) {
  if (!(await requireAccess(request, env))) return fail(401, "Not authorised.");
  const id = String(params.id || "");
  let post = null;
  try { post = await env.CONTENT.get("post:" + id, "json"); } catch {}
  if (!post) {
    let idx = [];
    try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
    const hit = idx.find(x => x.slug === id);
    if (hit) { try { post = await env.CONTENT.get("post:" + hit.id, "json"); } catch {} }
  }
  if (!post) return fail(404, "Not found.");
  return json({ post });
}
