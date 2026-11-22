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
    assert.ok(inline.length > 0);
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

  it('allows every external origin the pages and stylesheets load', () => {
    const sources = files
      .filter((file) => /\.(html|css)$/.test(file))
      .flatMap((file) => {
        const text = read(file);
        const fromHtml = [
          ...text.matchAll(
            /<(?:script|img|link|iframe)\b[^>]*?\s(?:src|href)="(https?:\/\/[^"]+)"/g,
          ),
        ]
          .filter(([tag]) => !/^<a\b/.test(tag) && !/rel="(?:canonical|alternate)"/.test(tag))
          .map((m) => m[1]);
        const fromCss = [
          ...text.matchAll(/(?:@import\s+url\(|url\()["']?(https?:\/\/[^"')]+)/g),
        ].map((m) => m[1]);
        return [...fromHtml, ...fromCss];
      });
    const origins = [...new Set(sources.map((url) => new URL(url).origin))];
    const allowedOrigins = csp.split(/[\s;]+/).filter((token) => token.startsWith('https://'));
    origins.forEach((origin) =>
      assert.ok(allowedOrigins.includes(origin), `${origin} is loaded but not in the CSP`),
    );
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

  it('defines a staging environment with its own name', () => {
    assert.match(wrangler.env.staging.name, /-staging$/);
  });

  it('needs no secrets', () => {
    assert.equal(wrangler.vars, undefined);
    assert.equal(wrangler.secrets, undefined);
  });
});
