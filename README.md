# syndica-link

The share link for [syndica-web](https://github.com/KheangLov/syndica-web). **Posts live only on syndica-web**: when a link-preview app (Telegram, Facebook, Messenger, WhatsApp, LinkedIn…) fetches a syndica-link URL it gets server-rendered preview tags, and when a person opens it they are redirected (302) to the same page on syndica-web. It's a **Nuxt 4 (SSR)** app built with [squirkle-ui](https://www.npmjs.com/package/squirkle-ui). It reads posts straight from syndica-web's JSON and renders every page with its full SEO and social tags, so Telegram's preview bot always gets a complete card with no JavaScript needed.

Routes mirror syndica-web: `/`, `/posts/<slug>` and `/tags/<tag>` (a trailing slash also works). No URL uses a query string.

## Why Telegram previews stay up to date

1. **Content arrives live.** In `github` mode the server checks syndica-web's newest commit (every 60s by default) and reads its files *pinned to that commit SHA*. A push shows up within a minute, with no rebuild or Pages deploy to wait for. A GitHub push webhook on `POST /api/revalidate` makes it immediate.
2. **Every page is server-rendered.** Title, description, Open Graph, Twitter, `article:*`, canonical, `telegram:channel` and JSON-LD are all in the HTML response, along with the post body. Bots never see an empty shell.
3. **Share links are plain URLs** (`/posts/<slug>`). After each publish, syndica-web's workflow asks Telegram (@WebpageBot) and Facebook/Messenger (Graph API re-scrape) to fetch them again, so cached previews update. WhatsApp builds previews on the sender's phone. Preview *image* URLs are versioned internally, so apps never reuse an old image.
4. **Preview images are generated on the server.** Posts without a cover get a 1200×630 card at `/og/<slug>/<version>.png`, drawn as soon as the page is requested so it's ready when the bot fetches it. Khmer is supported.
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

Deployed on **Vercel** at `https://syndica-link.vercel.app`; it uses Nitro's Vercel preset automatically. Recommended environment variables in Vercel (**Project → Settings → Environment Variables**):

- `NUXT_GITHUB_TOKEN`: a fine-grained, read-only token for syndica-web's contents. Every serverless cold start checks GitHub, and the limit without a token is 60 requests per hour per IP.
- `NUXT_REVALIDATE_SECRET`: add it together with the push webhook below for instant updates.
- `NUXT_PUBLIC_SITE_URL`: only needed for a custom domain.

The included `Dockerfile` runs it on any other Node host.
