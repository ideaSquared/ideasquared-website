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

- Every merge to `main` runs CI and then deploys to **staging** (`ideasquared-website-staging`).
- **Production** (`ideasquared-website`) is deployed with `ship production ideasquared-website` or Actions > Deploy.
  It only takes a commit that is already live on staging. `ship rollback ideasquared-website production` puts back
  the previous commit.
- GitHub Environments `staging` and `production` hold the secrets `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID`. `production` should require a reviewer.
- The site needs no other secrets or variables.

### Custom domains

`wrangler.jsonc` has no `routes` yet because the hostnames are not decided in code. Once the domain's zone is on
Cloudflare, add these to `wrangler.jsonc` (replace `<domain>`), set `workers_dev` to `false` in both places, and
point the health checks in `ship.yaml` at full URLs (see the comments there):

```jsonc
"routes": [
  { "pattern": "<domain>", "custom_domain": true },
  { "pattern": "www.<domain>", "custom_domain": true }
],
"env": {
  "staging": {
    "routes": [{ "pattern": "staging.<domain>", "custom_domain": true }],
    "workers_dev": false
  }
}
```

Cloudflare then issues the certificate and creates the DNS records for those hostnames.
