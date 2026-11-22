# CLAUDE.md

ideasquared-website is the public ideaSquared studio site: plain HTML, CSS and a little JavaScript, served as-is by
a Cloudflare Worker with static assets (`wrangler.jsonc`) and deployed through shipper (`ship.yaml`). Read
`README.md` first.

## Commands

- Type-check: none; the repo has no TypeScript.
- Test: `pnpm test` (Node's test runner over `test/`).
- Before you call a change done: `pnpm format:check && pnpm lint && pnpm check:html && pnpm test`, and
  `pnpm check:deploy` when `wrangler.jsonc`, `.assetsignore` or `_headers` change.
- Look at it: `pnpm exec wrangler dev --env staging` (serves the site with the real `_headers`).

## Working here

- The repo root is the published folder; files that are not part of the site go in `.assetsignore`.
- Do not reformat or "tidy" the published HTML, CSS or JS; Prettier ignores them on purpose.
- `_headers` carries the CSP. A new external origin or a changed inline `<script>` needs a matching CSP change;
  `pnpm test` says what is missing. Never add `'unsafe-inline'` to `script-src`.
- Only fingerprinted files may get `Cache-Control: immutable`. Nothing is fingerprinted today.
- No secrets, `vars` or API keys anywhere in the published files or `wrangler.jsonc`.
- Never run `wrangler deploy` yourself and do not create Cloudflare resources; deploys go through shipper.
- Conventional commits, one change per PR, tests with behaviour changes.

## Logging

- This site has no server code. If a Worker script is ever added, it logs through `@ideasquared/log` only, never
  `console.*`, and CI must fail on console calls.
- No personal data or secrets in logs. Log ids, not people.
- Load the `logging` skill (`.claude/skills/logging/SKILL.md`) before adding or changing any log line. It is a
  byte-identical copy of the canonical one in `agent-idea`; change it there first.

## Standards exceptions

None.
