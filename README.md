# Prismatic Care — website + admin panel

Static site for Cloudflare Pages, with a PIN-protected admin panel (Pages
Functions + R2 + KV) that lets Alvin manage staff and swap site photos.

## What Alvin can edit at /admin
- Staff: add, edit, reorder, remove (photo, name, pronouns, role, bio)
- A highlight colour per staff member, from the full brand rainbow, shown as a
  glow/border around the card on hover
- The two site photographs (the belonging-band group photo and the approach
  handshake photo)

Layout, logo and the prism are fixed. Alvin edits content, not structure.

## How it works
- The public page loads its staff and photos from `/api/content`. If the API is
  ever unreachable, it falls back to the content baked into `index.html`, so the
  site never breaks.
- Uploaded images go to an R2 bucket and are served from `/api/media/<key>`.
- Content (the staff list, colours, photo assignments) lives in a KV namespace.
- Sign-in uses a PIN; the server issues an HMAC-signed session cookie
  (HttpOnly, Secure, SameSite=Strict, 8 hour expiry). Failed logins are rate
  limited per IP.

## Deploy (Git-connected Pages)
Repo layout: static site in `public/`, Functions in `functions/` at the repo root.
The Functions folder sits OUTSIDE `public/` so Pages runs it instead of serving it as text.

This site uses Cloudflare Pages Functions, so deploy by connecting the Git repo
to a Pages project (NOT a drag-and-drop upload, which does not run Functions and
returns 405 on /api/*).

1. Push this folder to a Git repo and create a Pages project from it.
   Build command: none. Build output directory: public
2. In the Pages project, Settings > Functions, add the bindings:
   - KV namespace binding named CONTENT  -> a KV namespace you create (e.g. prismatic-care-content)
   - R2 bucket binding named MEDIA       -> an R2 bucket named prismatic-care-media
3. Settings > Environment variables / Secrets, add:
   - ADMIN_PIN       (8+ characters; this is what Alvin types to sign in)
   - SESSION_SECRET  (a long random string)
4. Redeploy (push a commit or hit Retry). Confirm it works by opening
   https://your-site/api/content in a browser - it should return JSON, not a 404.

The admin panel lives at /admin.

## Local development
```
npx wrangler pages dev . --kv CONTENT --r2 MEDIA \
  --binding ADMIN_PIN=yourpin --binding SESSION_SECRET=devsecret
```
Note: over local http the Secure session cookie will not be sent by some tools;
this works normally over https in production.

## Files
- `index.html` — public site (hydrates staff + photos from the API)
- `admin.html` — the admin panel
- `functions/_lib/util.js` — auth, validation, helpers
- `functions/api/*` — login, logout, content (GET/PUT), upload, media serving
- `wrangler.toml` — bindings config (set your KV id before wrangler deploy)
- `_headers` — security headers; no-store + noindex for /admin and /api
- `robots.txt` — disallows /admin and /api

## Contact form
The enquiry form posts to Web3Forms (key in `index.html`). No backend needed for
that; submissions arrive by email.
