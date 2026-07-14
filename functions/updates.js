import { page, esc, fmtDate, htmlResponse } from "./_lib/render.js";
const INDEX = "posts:index";

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  let posts = [];
  if (env.CONTENT) { try { posts = ((await env.CONTENT.get(INDEX, "json")) || []).filter(p => p.published); } catch {} }

  const cards = posts.map(p => {
    const cover = p.image
      ? `<div class="cover" style="background-image:url(/api/media/${esc(p.image)})"></div>`
      : `<div class="cover"></div>`;
    const tags = (p.areas && p.areas.length)
      ? `<div class="tags">${p.areas.slice(0,4).map(a => `<span class="tag">${esc(a)}</span>`).join("")}</div>` : "";
    return `<a class="post-card" href="/updates/${esc(p.slug)}">${cover}
<div class="pc-body"><div class="date">${esc(fmtDate(p.date))}</div><h2>${esc(p.title)}</h2>
<p>${esc(p.excerpt || "")}</p>${tags}<span class="more">Read more &rarr;</span></div></a>`;
  }).join("");

  const body = `<main class="wrap">
<div class="page-head"><div class="eyebrow">Updates</div><h1>News &amp; announcements</h1>
<p>New services, changes and things worth sharing from the Prismatic Care team.</p></div>
${posts.length ? `<div class="post-grid">${cards}</div>` : `<p class="empty">No updates yet. Check back soon.</p>`}
</main>`;

  const jsonld = {
    "@context": "https://schema.org", "@type": "Blog",
    "name": "Prismatic Care Updates", "url": origin + "/updates",
    "blogPost": posts.slice(0, 20).map(p => ({
      "@type": "BlogPosting", "headline": p.title, "datePublished": new Date(p.date).toISOString(),
      "url": origin + "/updates/" + p.slug,
    })),
  };
  return htmlResponse(page({
    title: "Updates & news — Prismatic Care",
    description: "News, new services and announcements from Prismatic Care, supporting South East Queensland.",
    canonical: origin + "/updates", ogType: "website", jsonld, body,
  }));
}
