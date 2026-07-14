import { json, ok, fail, requireAccess, sanitizePost, slugify } from "../../_lib/util.js";
const INDEX = "posts:index";

export async function onRequestPost({ request, env }) {
  if (!(await requireAccess(request, env))) return fail(401, "Not signed in.");
  if (!env.CONTENT) return fail(500, "Store not configured.");
  let input;
  try { input = await request.json(); } catch { return fail(400, "Invalid JSON."); }
  const clean = sanitizePost(input);
  if (!clean.title) return fail(400, "A title is required.");

  let idx = [];
  try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
  const id = crypto.randomUUID().replace(/-/g, "");
  let base = slugify(clean.title), slug = base, n = 2;
  while (idx.some(p => p.slug === slug)) { slug = base + "-" + n; n++; }
  const now = Date.now();
  const post = { id, slug, date: now, updated: now, ...clean };
  await env.CONTENT.put("post:" + id, JSON.stringify(post));
  idx.unshift({ id, slug, title: post.title, date: now, image: post.image, excerpt: post.excerpt, published: post.published, areas: post.areas || [] });
  await env.CONTENT.put(INDEX, JSON.stringify(idx.slice(0, 200)));
  return ok({ post });
}

export async function onRequestGet({ request, env }) {
  if (!(await requireAccess(request, env))) return fail(401, "Not authorised.");
  let idx = [];
  try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
  return json({ posts: idx });
}
