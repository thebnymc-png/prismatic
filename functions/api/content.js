import { json, seedContent, CONTENT_KEY } from "../_lib/util.js";

export async function onRequestGet({ env }) {
  let data = null;
  if (env.CONTENT) { try { data = await env.CONTENT.get(CONTENT_KEY, "json"); } catch {} }
  return json(data || seedContent(), { headers: { "cache-control": "no-store" } });
}
