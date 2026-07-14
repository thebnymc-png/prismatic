// Shared helpers for Prismatic Care admin API.
// Files/dirs starting with _ are not routed by Pages, but can be imported.

export const CONTENT_KEY = "content:v1";

// Each staff card has a highlight colour used for the hover glow/border.
// A border is decorative, not text, so the full vivid spectrum is fine here
// (unlike name text, which would fail contrast on the white card).
export const ALLOWED_COLORS = new Set([
  "#7B2FF7", // violet
  "#D6249F", // magenta
  "#FB5343", // coral
  "#FF9A1F", // amber
  "#2FBE5B", // green
  "#1FA2E0", // blue
  "#3B5BDB", // indigo
  "#131019", // ink (neutral default)
]);

export const IMAGE_SLOTS = new Set(["community", "handshake"]);

// Editable copy keys with max lengths. Anything not in here is ignored on save,
// so the client can only edit approved fields. Crisis lines are NOT here (locked).
export const ALLOWED_TEXT = {
  "hero.eyebrow": 90, "hero.headline": 80, "hero.lead": 320, "hero.chip1": 40, "hero.chip2": 40,
  "approach.eyebrow": 40, "approach.heading": 80, "approach.p1": 400, "approach.p2": 400, "approach.pull": 260,
  "supports.eyebrow": 40, "supports.heading": 80, "supports.intro": 320,
  "hours.big": 16, "hours.heading": 60, "hours.body": 320,
  "community.eyebrow": 40, "community.heading": 60, "community.p1": 400, "community.p2": 320,
  "areas.eyebrow": 40, "areas.heading": 80, "areas.lede": 320,
  "team.eyebrow": 40, "team.heading": 80, "team.intro": 260,
  "apply.eyebrow": 60, "apply.heading": 60, "apply.big": 120, "apply.svc": 160,
  "contact.eyebrow": 40, "contact.heading": 90, "contact.intro": 240,
};
const MEDIA_KEY_RE = /^[a-f0-9]{8,}\.(jpg|jpeg|png|webp)$/i;

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(init.headers || {}) },
  });
}
export const ok = (d, init) => json({ ok: true, ...d }, init);
export const fail = (status, msg) => json({ ok: false, error: msg }, { status });

// ---- base64url ----
const te = new TextEncoder(), td = new TextDecoder();
function b64urlBytes(bytes) {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesB64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(str), b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
const b64urlStr = (s) => b64urlBytes(te.encode(s));
const strB64url = (s) => td.decode(bytesB64url(s));

// ---- constant-time compare ----
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---- HMAC session tokens ----
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, te.encode(msg)));
}
function sessionSecret(env) {
  // Prefer a dedicated secret; fall back to the PIN so it still works if only
  // ADMIN_PIN is set. Setting SESSION_SECRET (long random) is recommended.
  return env.SESSION_SECRET || env.ADMIN_PIN || "";
}
export async function makeToken(env, ttlSec = 28800) {
  const payload = b64urlStr(JSON.stringify({ exp: Date.now() + ttlSec * 1000 }));
  const sig = b64urlBytes(await hmac(sessionSecret(env), payload));
  return payload + "." + sig;
}
export async function verifyToken(env, token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [payload, sig] = token.split(".");
  const expected = b64urlBytes(await hmac(sessionSecret(env), payload));
  if (!timingSafeEqual(sig, expected)) return false;
  try {
    const { exp } = JSON.parse(strB64url(payload));
    return typeof exp === "number" && Date.now() < exp;
  } catch { return false; }
}

export function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}
export const sessionCookie = (token, ttlSec = 28800) =>
  `pc_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ttlSec}`;
export const clearCookie = () =>
  `pc_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

export async function requireAuth(request, env) {
  return verifyToken(env, getCookie(request, "pc_session"));
}

// ---- content validation / normalisation ----
const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const mediaKey = (v) => (typeof v === "string" && MEDIA_KEY_RE.test(v) ? v : "");

export function sanitizeContent(input) {
  const out = { text: {}, supportCards: [], areas: [], staff: [], images: {} };

  // Editable copy: only approved keys, each length-capped. Newlines allowed;
  // other control characters stripped.
  const text = input?.text || {};
  for (const key in ALLOWED_TEXT) {
    if (typeof text[key] === "string") {
      const v = text[key].replace(/[\u0000-\u0009\u000B-\u001F]/g, "").slice(0, ALLOWED_TEXT[key]);
      if (v.trim()) out.text[key] = v;
    }
  }

  // Support cards: up to 12, each title + body.
  const cards = Array.isArray(input?.supportCards) ? input.supportCards.slice(0, 12) : [];
  for (const c of cards) {
    const title = clip(c?.title, 60).trim();
    if (!title) continue;
    out.supportCards.push({ title, body: clip(c?.body, 260).trim() });
  }

  // Service areas: up to 30 short names.
  const areas = Array.isArray(input?.areas) ? input.areas.slice(0, 30) : [];
  for (const a of areas) {
    const name = clip(a, 40).trim();
    if (name) out.areas.push(name);
  }

  const staff = Array.isArray(input?.staff) ? input.staff.slice(0, 24) : [];
  for (const s of staff) {
    const name = clip(s?.name, 60).trim();
    if (!name) continue;
    out.staff.push({
      id: clip(s?.id, 40) || crypto.randomUUID(),
      name,
      pronouns: clip(s?.pronouns, 40).trim(),
      role: clip(s?.role, 60).trim(),
      bio: clip(s?.bio, 8000).trim(),
      color: ALLOWED_COLORS.has(s?.color) ? s.color : "#131019",
      photo: mediaKey(s?.photo),
    });
  }
  const imgs = input?.images || {};
  for (const slot of IMAGE_SLOTS) {
    const k = mediaKey(imgs[slot]);
    if (k) out.images[slot] = k;
  }
  return out;
}

export function seedContent() {
  return {
    staff: [
      { id: "alvin", name: "Alvin", pronouns: "", role: "Founder", bio: "", color: "#131019", photo: "" },
      { id: "elijah", name: "Elijah", pronouns: "", role: "", bio: "", color: "#131019", photo: "" },
    ],
    images: {},
    text: {}, supportCards: [], areas: [],
  };
}


// ---------- blog / updates helpers ----------
export function slugify(s){
  return String(s||"").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,60) || "post";
}

// Whitelist HTML sanitiser for post bodies. Keeps a small set of formatting
// tags, strips every attribute except safe link hrefs, and drops scripts,
// styles, iframes and event handlers. Pure JS so it runs in Workers and tests.
const HTML_ALLOWED = {p:1,br:1,strong:1,b:1,em:1,i:1,u:1,h2:1,h3:1,ul:1,ol:1,li:1,blockquote:1,a:1};
export function sanitizeHTML(html){
  html = String(html||"");
  html = html.replace(/<!--[\s\S]*?-->/g,"");
  html = html.replace(/<(script|style|iframe|object|embed|noscript|template)[\s\S]*?<\/\1>/gi,"");
  html = html.replace(/<(script|style|iframe|object|embed)[^>]*>/gi,"");
  html = html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (m, slash, tag, attrs) => {
    tag = tag.toLowerCase();
    const out = tag==="b"?"strong": tag==="i"?"em": tag;
    if(!HTML_ALLOWED[tag]) return "";
    if(slash) return "</"+out+">";
    if(tag==="a"){
      const hm = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      let href = hm ? (hm[2]||hm[3]||hm[4]||"") : "";
      if(!/^(https?:|mailto:|tel:)/i.test(href)) return "<a>";
      href = href.replace(/"/g,"&quot;");
      return '<a href="'+href+'" rel="noopener noreferrer nofollow" target="_blank">';
    }
    return "<"+out+">";
  });
  return html.trim();
}

export function sanitizePost(input){
  const title = clip(input?.title, 120).trim();
  const body = sanitizeHTML(input?.body).slice(0, 40000);
  let excerpt = clip(input?.excerpt, 240).trim();
  if(!excerpt) excerpt = body.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,180);
  const areas = Array.isArray(input?.areas) ? input.areas.slice(0,12).map(a=>clip(a,40).trim()).filter(Boolean) : [];
  return { title, body, excerpt, image: mediaKey(input?.image), published: !!input?.published, areas };
}
