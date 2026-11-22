import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');

const walk = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'test')
      return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const files = walk('.');
const pages = files.filter((file) => file.endsWith('.html'));

// Comments out: only the rules count.
const headers = read('_headers').replace(/^\s*#.*$/gm, '');
const headerValue = (name) => headers.match(new RegExp(`^\\s+${name}:\\s*(.+)$`, 'm'))?.[1];
const csp = headerValue('Content-Security-Policy') ?? '';
const directive = (name) =>
  csp
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find(([n]) => n === name)
    ?.slice(1) ?? [];

const wrangler = JSON.parse(
  read('wrangler.jsonc')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1'),
);

describe('security headers (SITE-04)', () => {
  it('sets every required header for all paths', () => {
    assert.match(headers, /^\/\*$/m);
    assert.equal(headerValue('Strict-Transport-Security'), 'max-age=63072000; includeSubDomains');
    assert.equal(headerValue('X-Content-Type-Options'), 'nosniff');
    assert.equal(headerValue('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.equal(headerValue('Cross-Origin-Opener-Policy'), 'same-origin');
    const permissions = headerValue('Permissions-Policy') ?? '';
    ['camera=()', 'microphone=()', 'geolocation=()'].forEach((p) =>
      assert.ok(permissions.includes(p), p),
    );
  });

  it('has a CSP that blocks inline scripts and framing', () => {
    assert.ok(!directive('script-src').includes("'unsafe-inline'"));
    assert.deepEqual(directive('frame-ancestors'), ["'none'"]);
  });
});

describe('the CSP matches what the pages load', () => {
  it('allows every inline script by hash', () => {
    const allowed = directive('script-src');
    const inline = pages.flatMap((page) =>
      [...read(page).matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => ({
        page,
        hash: `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
      })),
    );
    inline.forEach(({ page, hash }) =>
      assert.ok(allowed.includes(hash), `${page}: ${hash} is not in script-src`),
    );
  });

  it('lists no inline script hash that no page uses', () => {
    const used = new Set(
      pages.flatMap((page) =>
        [...read(page).matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
          (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
        ),
      ),
    );
    directive('script-src')
      .filter((source) => source.startsWith("'sha256-"))
      .forEach((hash) => assert.ok(used.has(hash), `${hash} is unused`));
  });

  it('allows every external origin in the directive for its resource type', () => {
    // CSP fallback chain: the first directive present wins, default-src is last.
    const allowedFor = (...names) =>
      directive(names.find((name) => directive(name).length) ?? 'default-src');
    const loads = files
      .filter((file) => /\.(html|css)$/.test(file))
      .flatMap((file) => {
        const text = read(file);
        const tags = [...text.matchAll(/<(script|img|link|iframe)\b([^>]*)>/g)].flatMap(
          ([, tag, attrs]) => {
            const url = attrs.match(/\s(?:src|href)="(https?:\/\/[^"]+)"/)?.[1];
            if (!url) return [];
            if (tag === 'script') return [{ url, names: ['script-src-elem', 'script-src'] }];
            if (tag === 'img') return [{ url, names: ['img-src'] }];
            if (tag === 'iframe') return [{ url, names: ['frame-src', 'child-src'] }];
            return /rel="stylesheet"/.test(attrs)
              ? [{ url, names: ['style-src-elem', 'style-src'] }]
              : [];
          },
        );
        const imports = [...text.matchAll(/@import\s+url\(["']?(https?:\/\/[^"')]+)/g)].map(
          (m) => ({
            url: m[1],
            names: ['style-src-elem', 'style-src'],
          }),
        );
        const fonts = [...text.matchAll(/@font-face\s*\{[^}]*url\(["']?(https?:\/\/[^"')]+)/g)].map(
          (m) => ({
            url: m[1],
            names: ['font-src'],
          }),
        );
        return [...tags, ...imports, ...fonts];
      });
    loads.forEach(({ url, names }) => {
      const origin = new URL(url).origin;
      assert.ok(
        allowedFor(...names).includes(origin),
        `${origin} is loaded as ${names.at(-1)} but not allowed there`,
      );
    });
  });

  it('self-hosts its fonts, so no page makes a third-party request for them', () => {
    const css = files
      .filter((file) => file.endsWith('.css'))
      .map(read)
      .join('\n');
    assert.doesNotMatch(css, /fonts\.(googleapis|gstatic)\.com/);
    const fontFiles = [...css.matchAll(/@font-face\s*\{[^}]*url\(["']?([^"')]+)/g)].map(
      (m) => m[1],
    );
    assert.ok(fontFiles.length > 0);
    fontFiles.forEach((url) => {
      assert.match(url, /^\/assets\/fonts\//, `${url} is not self-hosted`);
      assert.ok(existsSync(join(root, url)), `${url} is missing`);
    });
    assert.deepEqual(directive('font-src'), ["'self'"]);
  });

  it('stores nothing in the browser, as the privacy notice says', () => {
    const scripts = files
      .filter((file) => file.endsWith('.js'))
      .map(read)
      .join('\n');
    assert.doesNotMatch(scripts, /localStorage|sessionStorage|document\.cookie|indexedDB/);
  });
});

describe('caching (SITE-05)', () => {
  it('uses immutable only for fingerprinted paths', () => {
    const rules = headers.split(/^(?=\S)/m).filter((block) => /immutable/.test(block));
    rules.forEach((block) => {
      const pattern = block.split('\n')[0] ?? '';
      assert.match(pattern, /\.[0-9a-f]{6,}\./, `${pattern} is not a fingerprinted path`);
    });
  });
});

describe('Workers static assets config (SITE-12, SITE-14, SITE-16, SITE-18)', () => {
  it('is assets-only with a 404 page', () => {
    assert.equal(wrangler.main, undefined);
    assert.ok(wrangler.assets.directory);
    assert.equal(wrangler.assets.not_found_handling, '404-page');
    assert.ok(wrangler.assets.html_handling);
    assert.ok(existsSync(join(root, wrangler.assets.directory, '404.html')));
  });

  it('keeps preview URLs on for the production Worker, whatever workers_dev says', () => {
    assert.equal(wrangler.preview_urls, true);
    assert.equal(wrangler.env.staging.preview_urls, false);
  });

  it('serves production on the apex and www, and staging on its own subdomain, as custom domains', () => {
    const hosts = (routes) =>
      routes.map((route) =>
        route.custom_domain === true ? route.pattern : `not a custom domain: ${route.pattern}`,
      );
    assert.deepEqual(hosts(wrangler.routes), ['ideasquared.co.uk', 'www.ideasquared.co.uk']);
    assert.deepEqual(hosts(wrangler.env.staging.routes), ['staging.ideasquared.co.uk']);
  });

  it('turns workers.dev off for both Workers while previews stay on', () => {
    assert.equal(wrangler.workers_dev, false);
    assert.equal(wrangler.env.staging.workers_dev, false);
    assert.equal(wrangler.preview_urls, true);
  });

  it('checks every served hostname after a deploy (ship.yaml health and smoke)', () => {
    const ship = read('ship.yaml');
    assert.match(ship, /staging: \{ url: 'https:\/\/staging\.ideasquared\.co\.uk\/'/);
    assert.match(ship, /production: \{ url: 'https:\/\/ideasquared\.co\.uk\/'/);
    const smoke = ship.slice(ship.indexOf('\nsmoke:'));
    [
      'https://staging.ideasquared.co.uk/',
      'https://ideasquared.co.uk/',
      'https://www.ideasquared.co.uk/',
    ].forEach((url) => assert.ok(smoke.includes(`'${url}'`), `${url} is not smoke-checked`));
  });

  it('defines a staging environment with its own name', () => {
    assert.match(wrangler.env.staging.name, /-staging$/);
  });

  it('needs no secrets', () => {
    assert.equal(wrangler.vars, undefined);
    assert.equal(wrangler.secrets, undefined);
  });
});

describe('deploy and preview flow', () => {
  const ci = read('.github/workflows/ci.yml');
  const preview = read('.github/workflows/preview.yml');

  it('deploys production after staging, in the same run, through shipper', () => {
    assert.match(
      ci,
      /deploy-production:[\s\S]*?needs: deploy-staging[\s\S]*?environment: production/,
    );
    assert.match(read('ship.yaml'), /production:\s*\n\s*requires: \[staging\]/);
    assert.doesNotMatch(ci + preview, /wrangler (pages )?deploy( |$)/m);
  });

  it('previews only same-repo PRs, with write access on the preview job alone', () => {
    assert.match(preview, /head\.repo\.full_name == github\.repository/);
    assert.match(preview, /github\.event\.pull_request\.user\.login != 'dependabot\[bot\]'/);
    assert.match(preview, /environment: preview/);
    assert.match(preview, /--preview-alias "pr-\$\{PR_NUMBER\}"/);
    assert.match(preview, /^permissions:\n {2}contents: read\n/m);
    assert.equal(preview.match(/pull-requests: write/g)?.length, 1);
  });

  it('never interpolates event data into a run script', () => {
    const runs = [
      ...preview.matchAll(
        /^ +(?:- )?run: [|>]?-?\n?([\s\S]*?)(?=^ {6}- |^ {6}[a-z-]+:|(?![\s\S]))/gm,
      ),
    ].map((m) => m[1]);
    assert.ok(runs.length >= 4);
    assert.ok(runs.some((script) => script.includes('pnpm install')));
    runs.forEach((script) => assert.doesNotMatch(script, /\$\{\{ *github\.event/));
  });
});

describe('robots.txt and sitemap.xml (SITE-10)', () => {
  const origin = 'https://ideasquared.co.uk';
  const pageUrl = (page) =>
    `${origin}/${page === 'index.html' ? '' : page.replace(/index\.html$/, '')}`;
  const publicPages = pages.filter((page) => page !== '404.html');
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it('robots.txt allows everything and points at the sitemap', () => {
    const robots = read('robots.txt');
    assert.match(robots, /^User-agent: \*$/m);
    assert.match(robots, /^Allow: \/$/m);
    assert.doesNotMatch(robots, /^Disallow: \/\S*/m);
    assert.match(robots, new RegExp(`^Sitemap: ${origin}/sitemap\\.xml$`, 'm'));
  });

  it('sitemap.xml lists every public page once, and nothing else', () => {
    assert.deepEqual([...locs].sort(), publicPages.map(pageUrl).sort());
    assert.equal(new Set(locs).size, locs.length);
  });

  it('does not list a URL that _redirects sends elsewhere, and uses each page canonical URL', () => {
    const sources = read('_redirects')
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((source) => source && !source.startsWith('#'))
      .map((source) => source.replace(/\*$/, ''));
    locs.forEach((loc) => {
      const path = new URL(loc).pathname;
      sources.forEach((source) =>
        assert.ok(!path.startsWith(source) || source === '/', `${loc} is redirected`),
      );
    });
    publicPages.forEach((page) =>
      assert.ok(
        read(page).includes(`<link rel="canonical" href="${pageUrl(page)}">`),
        `${page} canonical differs from the sitemap`,
      ),
    );
  });

  it('publishes robots.txt and sitemap.xml (not in .assetsignore)', () => {
    const ignored = read('.assetsignore')
      .split('\n')
      .map((line) => line.trim());
    ['robots.txt', 'sitemap.xml'].forEach((file) => {
      assert.ok(existsSync(join(root, file)));
      assert.ok(!ignored.includes(file) && !ignored.includes(`/${file}`), `${file} is ignored`);
    });
  });
});

describe('Lighthouse gate (SITE-07)', () => {
  const assertions = JSON.parse(read('lighthouserc.json')).ci.assert.assertions;

  it('fails the build below 0.95 accessibility', () => {
    assert.deepEqual(assertions['categories:accessibility'], ['error', { minScore: 0.95 }]);
  });
});
