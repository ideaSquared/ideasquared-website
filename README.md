# ideasquared-website

The public site of ideaSquared, a UK venture studio: the studio pages, the thesis, the journal and a page for
each venture. It is plain HTML, CSS and a little JavaScript with no build step, served by a Cloudflare Worker with
static assets and deployed through [ideaSquared/shipper](https://github.com/ideaSquared/shipper). Until the
cutover in the pull request that added this setup is done, the live site is still served by Netlify.

## Layout

- `index.html`, `thesis/`, `studio/`, `journal/`, `ventures/`: the pages. Each is a folder with an `index.html`.
- `styles/` and `scripts/`: the shared stylesheet and scripts. `scripts/ventures-data.js` lists the ventures.
- `404.html`, `_headers`: the 404 page and the response headers (security headers and the CSP).
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
pnpm exec lhci autorun   # Lighthouse CI over the pages served by wrangler dev (needs Chrome)
```

There is no type-check step (no TypeScript) and no build step.

Things to know when editing:

- The CSP in `_headers` allows the inline scripts in the pages by hash. If you change an inline `<script>`, its
  hash changes and `pnpm test` fails until you update the hash in `_headers`. New external origins (fonts, images,
  scripts) must be added to the CSP; the test lists any that are missing.
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

`wrangler.jsonc` has no `routes` yet: they are added after the first staging deploy, once the zone for
`ideasquared.co.uk` is on Cloudflare. Then add these to `wrangler.jsonc`, set `workers_dev` to `false` in both places (keep `preview_urls: true` on the production Worker), and
point the health checks in `ship.yaml` at full URLs (see the comments there):

```jsonc
"routes": [
  { "pattern": "ideasquared.co.uk", "custom_domain": true },
  { "pattern": "www.ideasquared.co.uk", "custom_domain": true }
],
"env": {
  "staging": {
    "routes": [{ "pattern": "staging.ideasquared.co.uk", "custom_domain": true }],
    "workers_dev": false
  }
}
```

Cloudflare then issues the certificate and creates the DNS records for those hostnames.
