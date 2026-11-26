# syndica-link

The server-rendered share front for [syndica-web](https://github.com/KheangLov/syndica-web). It's a **Nuxt 4 (SSR)** app built with [squirkle-ui](https://www.npmjs.com/package/squirkle-ui). It reads posts straight from syndica-web's JSON and renders every page with its full SEO and social tags, so Telegram's preview bot always gets a complete card with no JavaScript needed.

Routes mirror syndica-web: `/` and `/posts/<slug>` (a trailing slash also works).

## Why Telegram previews stay up to date

1. **Content arrives live.** In `github` mode the server checks syndica-web's newest commit (every 60s by default) and reads its files *pinned to that commit SHA*. A push shows up within a minute, with no rebuild or Pages deploy to wait for. A GitHub push webhook on `POST /api/revalidate` makes it immediate.
2. **Every page is server-rendered.** Title, description, Open Graph, Twitter, `article:*`, canonical, `telegram:channel` and JSON-LD are all in the HTML response, along with the post body. Bots never see an empty shell.
3. **Share links are versioned.** Share buttons use `/posts/<slug>?v=<content-hash>`. Telegram caches previews per URL, so an edited post gets a new URL and a fresh card, with no manual `@WebpageBot` step. The canonical URL stays clean (no `?v`).
4. **Preview images are generated on the server.** Posts without a cover get a 1200×630 card at `/og/<slug>.png?v=…`, drawn as soon as the page is requested so it's ready when the bot fetches it. Khmer is supported.
5. **No blank boxes.** Images are plain `<img>` tags in the server HTML, and content is loaded at boot. If GitHub is briefly unavailable, the last good copy is served.

Also included: `sitemap.xml`, `robots.txt` and `feed.xml` (RSS).

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm run preview
```

Check what Telegram sees:

```bash
curl -s -A "TelegramBot (like TwitterBot)" http://localhost:3000/posts/khmer-preview-test | grep -E 'og:|twitter:'
```

## Configure

Copy `.env.example` to `.env`. The main settings:

| Variable | Default | Purpose |
|---|---|---|
| `NUXT_PUBLIC_SITE_URL` | request host | Public origin for absolute `og:url` / `og:image` |
| `NUXT_CONTENT_MODE` | `github` | `github` (live from the repo) or `pages` (deployed syndica-web) |
| `NUXT_CONTENT_REPO` | `KheangLov/syndica-web` | Source repo |
| `NUXT_CONTENT_REFRESH_SECONDS` | `60` | How often to check for a new commit |
| `NUXT_GITHUB_TOKEN` | – | Optional read-only token: raises the GitHub API limit from 60/h to 5000/h |
| `NUXT_REVALIDATE_SECRET` | – | Enables `POST /api/revalidate` |

### Instant updates (optional)

In **syndica-web → Settings → Webhooks**, add a webhook:
- **Payload URL:** `https://<your-domain>/api/revalidate`
- **Content type:** `application/json`
- **Secret:** the same value as `NUXT_REVALIDATE_SECRET`
- **Events:** push only

## Deploy

This needs a Node server; GitHub Pages can't run SSR. Use any Node or Docker host (Render, Railway, Fly.io, a VPS…):

```bash
docker build -t syndica-link .
docker run -p 3000:3000 -e NUXT_PUBLIC_SITE_URL=https://link.example.com syndica-link
```

Then, in **syndica-web → Settings → Secrets and variables → Actions → Variables**, set `SHARE_BASE_URL` to the same public URL. syndica-web's share buttons will then hand out versioned syndica-link URLs, and its canonical tags will point here.
