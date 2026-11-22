# ideasquared-website

The public site of ideaSquared, a UK venture studio: how the studio works, the build log and a page for
each venture. It is plain HTML, CSS and a little JavaScript with no build step, served by a Cloudflare Worker with
static assets and deployed through [ideaSquared/shipper](https://github.com/ideaSquared/shipper). Until the
cutover in the pull request that added this setup is done, the live site is still served by Netlify.

## Layout

- `index.html`, `how-we-work/`, `about/`, `press/`, `privacy/`, `journal/`, `ventures/`: the pages. Each is a folder with an `index.html`.
- `styles/` and `scripts/`: the shared stylesheet and scripts. `scripts/ventures-data.js` lists the ventures.
- `assets/`: the logo mark and the self-hosted fonts (SIL Open Font License, licence texts alongside).
- `styles/tokens.css`: generated from the ideaSquared Design System, which is the source of truth for colour, type, spacing, radii and shadows. Change a value there first, then here.
- `404.html`, `_headers`, `_redirects`: the 404 page, the response headers (security headers and the CSP) and
  the redirects from the removed `/thesis/` and `/studio/` pages.
- `robots.txt`, `sitemap.xml`: crawler rules and the list of public pages (every page has a canonical link at the
  same `https://ideasquared.co.uk/...` URL, and `pnpm test` checks the two agree).
- `wrangler.jsonc`, `ship.yaml`, `.assetsignore`: how the site is served and deployed.

The repo root is the published folder, so everything that is not part of the site (`package.json`, `README.md`,
`test/`, ...) is listed in `.assetsignore` and is never uploaded. Add a new tooling file there too; CI fails if
a known tooling file becomes reachable.

## Develop

Needs Node.js 24 (`.nvmrc`) and pnpm (pinned in `package.json`; run `corepack enable` once).

```bash
pnpm install
pnpm exec wrangler dev --env staging   # serves the site with the real headers on http://127.0.0.1:8787
```

Checks (all run in CI):

```bash
pnpm format:check   # Prettier, tooling files only; the published HTML, CSS and JS are formatted by hand
pnpm lint           # ESLint over scripts/
pnpm check:html     # html-validate over every .html file
pnpm test           # the CSP matches the pages, header values, caching rule, wrangler config
pnpm check:deploy   # wrangler deploy --dry-run for production and staging
pnpm exec lhci autorun   # Lighthouse CI over the pages served by wrangler dev (needs Chrome); accessibility must be >= 0.95
```

There is no type-check step (no TypeScript) and no build step.

Things to know when editing:

- The CSP in `_headers` allows the site's own files only: the pages have no inline scripts and the fonts are
  self-hosted. An inline `<script>` needs its hash in `_headers`, and a new external origin (fonts, images,
  scripts) must be added to the CSP; `pnpm test` lists any that are missing.
- Nothing is fingerprinted, so no file gets `immutable` caching. Only add that for paths whose name changes with
  their content.
- Commits follow Conventional Commits (commitlint runs on `commit-msg`).

## Deploy

Deploys go through shipper (`ship.yaml`); nothing runs `wrangler deploy` directly.

- **Preview (pull requests):** every pull request from this repo (not forks, not Dependabot) uploads a preview
  version of the production Worker with `wrangler versions upload --preview-alias pr-<number>` and keeps one
  comment on the PR with the URL, `https://pr-<number>-ideasquared-website.<workers.dev subdomain>.workers.dev`
  (`preview.yml`). A preview version gets no production traffic and is not a deploy. It is served from
  `workers.dev` through Cloudflare's version URLs, which `preview_urls: true` in `wrangler.jsonc` keeps on after
  `workers_dev` is set to `false` (their default follows `workers_dev`). Only the 1000 most recent aliases are kept.
- **Merge to `main`:** CI runs, then shipper deploys **staging** (`ideasquared-website-staging`) and, in the same
  run, **production** (`ideasquared-website`). There is no manual production step and no reviewer. The gate for
  production is the merge itself (the commit is on `main`, `Verify` and `Lighthouse` passed) plus staging: the
  commit must be live on staging with its health check passing (`requires: [staging]` in `ship.yaml`). If staging
  fails, production does not run. A failed health check rolls that Worker back to its previous version.
- **Manual deploy and rollback:** Actions > Deploy re-runs a deploy for `main`'s head; `ship rollback
ideasquared-website production` puts back the previous commit.
- **GitHub Environments:** `staging` and `production` hold `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`;
  `production` is limited to the `main` branch and has no required reviewer (`ship doctor` warns about that; it is
  expected). `preview` holds its own pair of the same two secrets for the preview job, so pull-request code never
  sees the production Environment.
- The site needs no other secrets or variables.

### Custom domains

The site is served from `ideasquared.co.uk` and `www.ideasquared.co.uk` (production) and
`staging.ideasquared.co.uk` (staging) as Workers custom domains (`routes` with `custom_domain: true` in
`wrangler.jsonc`); `workers_dev` is `false` for both Workers. The zone is on Cloudflare DNS, and each deploy keeps
the DNS records and the certificate for those hostnames in place. Notes:

- Matching is exact, so the apex and `www` are two entries. Both serve the same content; `www` does not redirect.
- Cloudflare's docs name an existing **CNAME** on a hostname as the blocker for a custom domain. When wrangler runs
  without a terminal (shipper's deploy does), it asks Cloudflare to override a conflicting DNS record or origin;
  run by hand it asks first. If a deploy ever fails on a conflicting record, delete that record in Cloudflare >
  DNS and re-run the failed job.
- `ship.yaml` checks all three hostnames after a deploy (health on the apex and staging, smoke on all three). The
  first deploy after a hostname is attached can fail while its certificate is still being issued; re-run the
  failed job.
- `preview_urls: true` stays on the production Worker: pull-request previews are served from `workers.dev` version
  URLs, which custom domains cannot serve (see Deploy).
