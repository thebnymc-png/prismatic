import { json, fail } from "../../_lib/util.js";
const INDEX = "posts:index";
async function getPost(env, key) {
  let p = null;
  try { p = await env.CONTENT.get("post:" + key, "json"); } catch {}
  if (p) return p;
  let idx = [];
  try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
  const hit = idx.find(x => x.slug === key);
  if (!hit) return null;
  try { return await env.CONTENT.get("post:" + hit.id, "json"); } catch { return null; }
}
export async function onRequestGet({ params, env }) {
  if (!env.CONTENT) return fail(404, "Not found.");
  const post = await getPost(env, String(params.id || ""));
  if (!post || !post.published) return fail(404, "Not found.");
  return json({ post });
}
