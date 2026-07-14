const INDEX = "posts:index";
export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  let posts = [];
  if (env.CONTENT) { try { posts = ((await env.CONTENT.get(INDEX, "json")) || []).filter(p => p.published); } catch {} }
  const url = (loc, lastmod, pri) =>
    `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${pri ? `<priority>${pri}</priority>` : ""}</url>`;
  const urls = [
    url(origin + "/", null, "1.0"),
    url(origin + "/updates", null, "0.8"),
    ...posts.map(p => url(origin + "/updates/" + p.slug, new Date(p.updated || p.date).toISOString().slice(0, 10), "0.7")),
  ].join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
