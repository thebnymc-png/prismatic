// Server-side rendering for the public Updates pages (SEO-friendly).
// Pure string building so it runs in Workers and in Node tests.

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function fmtDate(t) {
  try { return new Date(t).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return new Date(t).toISOString().slice(0, 10); }
}

const PAGE_CSS = `
:root{--violet:#7B2FF7;--magenta:#D6249F;--coral:#FB5343;--amber:#FF9A1F;--green:#2FBE5B;--blue:#1FA2E0;--indigo:#3B5BDB;
--spectrum:linear-gradient(100deg,var(--violet),var(--magenta) 22%,var(--coral) 42%,var(--amber) 58%,var(--green) 74%,var(--blue) 88%,var(--indigo));
--ink:#131019;--ink-soft:#4c4658;--ink-faint:#6f6880;--paper:#fdfcfb;--panel:#f3eff8;--line:#e2dcea;--card:#fff;
--display:"Bricolage Grotesque",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif;--mono:"Space Mono",ui-monospace,monospace;--maxw:1140px}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--body);color:var(--ink);background:var(--paper);font-size:1.0625rem;line-height:1.72;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 28px}
header{background:var(--ink);position:sticky;top:0;z-index:50}
.nav{display:flex;align-items:center;justify-content:space-between;height:78px}
.nav .brand img{height:30px}
.nav-links{display:flex;align-items:center;gap:26px}
.nav-links a{font-size:.94rem;color:rgba(255,255,255,.82);font-weight:500}
.nav-links a:hover{color:#fff}
.btn{display:inline-flex;align-items:center;gap:.5em;font-weight:600;font-size:.95rem;padding:11px 22px;border-radius:999px;cursor:pointer;border:none;transition:transform .15s,box-shadow .2s}
.btn-spectrum{background:var(--spectrum);color:#fff}
.btn-spectrum:hover{transform:translateY(-1px);box-shadow:0 10px 26px -12px rgba(123,47,247,.6)}
.btn-ghost{background:#fff;border:1.5px solid var(--line);color:var(--ink)}
.btn-ghost:hover{border-color:var(--ink)}
.eyebrow{font-family:var(--mono);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);display:flex;align-items:center;gap:.7em}
.eyebrow::before{content:"";width:24px;height:2px;border-radius:2px;background:var(--spectrum)}
.page-head{padding:70px 0 34px}
.page-head h1{font-family:var(--display);font-weight:700;font-size:clamp(2.2rem,calc(5vw * var(--a11y-scale,1)),3.4rem);letter-spacing:-.02em;margin-top:16px}
.page-head p{color:var(--ink-soft);margin-top:12px;max-width:560px}
main{min-height:52vh;padding-bottom:80px}
.post-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:26px;margin-top:20px}
.post-card{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden;transition:transform .22s,box-shadow .22s;display:flex;flex-direction:column}
.post-card:hover{transform:translateY(-4px);box-shadow:0 24px 48px -26px rgba(19,16,25,.28)}
.post-card .cover{aspect-ratio:16/9;background:linear-gradient(135deg,#efe9f7,#e6f1fa) center/cover}
.post-card .pc-body{padding:22px 24px 26px;display:flex;flex-direction:column;gap:8px;flex:1}
.post-card .date{font-family:var(--mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
.post-card h2{font-family:var(--display);font-weight:600;font-size:1.35rem;letter-spacing:-.01em}
.post-card p{color:var(--ink-soft);font-size:.96rem;flex:1}
.post-card .tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{font-family:var(--mono);font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;background:var(--panel);color:var(--ink-faint);padding:3px 9px;border-radius:999px}
.post-card .more{font-weight:600;color:var(--violet);font-size:.92rem;margin-top:2px}
.empty{color:var(--ink-faint);padding:40px 0}
.article{max-width:760px;margin:0 auto}
.article .back{display:inline-flex;align-items:center;gap:.4em;color:var(--ink-faint);font-size:.9rem;margin-bottom:22px}
.article .back:hover{color:var(--ink)}
.article .date{font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)}
.article h1{font-family:var(--display);font-weight:700;font-size:clamp(2rem,calc(4.5vw * var(--a11y-scale,1)),3rem);letter-spacing:-.02em;margin:12px 0 16px}
.article .served{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:26px}
.article .served .lbl{font-family:var(--mono);font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)}
.article .cover{width:100%;border-radius:20px;margin-bottom:30px;aspect-ratio:16/9;object-fit:cover;background:linear-gradient(135deg,#efe9f7,#e6f1fa)}
.article .body{font-size:1.12rem;line-height:1.75;color:var(--ink-soft)}
.article .body h2{font-family:var(--display);color:var(--ink);font-size:1.6rem;margin:1.4em 0 .4em;letter-spacing:-.01em}
.article .body h3{font-family:var(--display);color:var(--ink);font-size:1.25rem;margin:1.2em 0 .3em}
.article .body p{margin:1em 0}
.article .body ul,.article .body ol{margin:1em 0 1em 1.4em}
.article .body li{margin:.3em 0}
.article .body blockquote{border-left:3px solid;border-image:var(--spectrum) 1;margin:1.2em 0;padding:.2em 0 .2em 20px;font-size:1.2rem;color:var(--ink)}
.article .body a{color:var(--violet);text-decoration:underline;text-underline-offset:2px}
footer{background:var(--ink);color:rgba(255,255,255,.7);padding:50px 0 40px}
.foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}
.foot img{height:26px}.foot small{font-size:.85rem}
.foot-credit{margin-top:30px;padding-top:22px;border-top:1px solid rgba(255,255,255,.08);text-align:center}
.foot-credit a{font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;color:rgba(255,255,255,.5);display:inline-flex;align-items:center;gap:.6em}
.foot-credit a::before{content:"";width:16px;height:2px;border-radius:2px;background:var(--spectrum);opacity:.7}
.foot-credit a:hover{color:#fff}
@media (max-width:640px){.nav-links a:not(.btn){display:none}}
`;

const HEADER = `<header><div class="wrap nav">
<a class="brand" href="/" aria-label="Prismatic Care home"><img src="/assets/logo-white.png" alt="Prismatic Care"></a>
<nav class="nav-links">
<a href="/#supports">Supports</a><a href="/#team">Our team</a><a href="/updates">Updates</a><a href="/#contact">Contact</a>
<a href="https://www.jotform.com/form/260211704799055" target="_blank" rel="noopener" class="btn btn-spectrum">Apply here</a>
</nav></div></header>`;

function footerHTML() {
  return `<footer><div class="wrap"><div class="foot">
<img src="/assets/logo-white.png" alt="Prismatic Care">
<small>&copy; ${new Date().getFullYear()} Prismatic Care &middot; South East Queensland</small>
</div><div class="foot-credit"><a href="https://bwbstudio.cc" target="_blank" rel="noopener">Developed by BWB Studio</a></div></div></footer>`;
}

export function page({ title, description, canonical, ogImage, ogType = "website", jsonld, body }) {
  const ld = jsonld
    ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>`
    : "";
  const img = ogImage ? `
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:image" content="${esc(ogImage)}">` : "";
  return `<!DOCTYPE html><html lang="en-AU"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="Prismatic Care">${img}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
<script src="/assets/a11y.js"></script>
${ld}
</head><body>
${HEADER}
${body}
${footerHTML()}
</body></html>`;
}

export function htmlResponse(html, status = 200, cacheSeconds = 300) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": `public, max-age=${cacheSeconds}`,
    },
  });
}
