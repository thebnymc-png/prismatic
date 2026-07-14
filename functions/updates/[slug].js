import { page, esc, fmtDate, htmlResponse } from "../_lib/render.js";
const INDEX = "posts:index";

async function getBySlug(env, slug) {
  let idx = [];
  try { idx = (await env.CONTENT.get(INDEX, "json")) || []; } catch {}
  const hit = idx.find(x => x.slug === slug);
  if (!hit) return null;
  try { return await env.CONTENT.get("post:" + hit.id, "json"); } catch { return null; }
}

export async function onRequestGet({ params, request, env }) {
  const origin = new URL(request.url).origin;
  const slug = String(params.slug || "");
  const canonical = origin + "/updates/" + slug;
  if (!env.CONTENT) return notFound(origin);

  const post = await getBySlug(env, slug);
  if (!post || !post.published) return notFound(origin, canonical);

  const areas = Array.isArray(post.areas) ? post.areas : [];
  const ogImage = post.image ? origin + "/api/media/" + post.image : "";
  const cover = post.image ? `<img class="cover" src="/api/media/${esc(post.image)}" alt="${esc(post.title)}">` : "";
  const served = areas.length
    ? `<div class="served"><span class="lbl">Serving</span>${areas.map(a => `<span class="tag">${esc(a)}</span>`).join("")}</div>` : "";

  const body = `<main class="wrap"><article class="article">
<a class="back" href="/updates">&larr; All updates</a>
${cover}
<div class="date">${esc(fmtDate(post.date))}</div>
<h1>${esc(post.title)}</h1>
${served}
<div class="body">${post.body || ""}</div>
</article></main>`;

  const jsonld = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt || "",
    "datePublished": new Date(post.date).toISOString(),
    "dateModified": new Date(post.updated || post.date).toISOString(),
    "author": { "@type": "Organization", "name": "Prismatic Care" },
    "publisher": { "@type": "Organization", "name": "Prismatic Care", "logo": { "@type": "ImageObject", "url": origin + "/assets/logo-email.png" } },
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
  };
  if (ogImage) jsonld.image = [ogImage];
  if (areas.length) jsonld.contentLocation = areas.map(a => ({ "@type": "Place", "name": a }));

  return htmlResponse(page({
    title: post.title + " — Prismatic Care",
    description: post.excerpt || post.title,
    canonical, ogImage, ogType: "article", jsonld, body,
  }));
}

function notFound(origin, canonical) {
  const body = `<main class="wrap"><div class="article"><a class="back" href="/updates">&larr; All updates</a>
<h1>Update not found</h1><p class="empty">This update may have been moved or removed.</p></div></main>`;
  return htmlResponse(page({ title: "Not found — Prismatic Care", description: "Update not found.", canonical: canonical || origin + "/updates", body }), 404);
}
