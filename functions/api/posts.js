import { json } from "../_lib/util.js";
const INDEX = "posts:index";
export async function onRequestGet({ env }) {
  if (!env.CONTENT) return json({ posts: [] });
  let idx = [];
  try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
  return json({ posts: idx.filter(p => p.published) });
}
