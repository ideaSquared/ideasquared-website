// Builds the blog from blog-src/: every post whose date in schedule.json has arrived becomes
// blog/<slug>/index.html, plus blog/index.html and sitemap.xml. Posts whose date is still ahead stay
// in blog-src/ only, which .assetsignore keeps off the live site.
//
//   node blog-src/build.mjs                 build for today (UTC)
//   node blog-src/build.mjs --today 2027-01-05
//   node blog-src/build.mjs --check [...]   exit 1 if any built file differs from what is on disk
//
// The page shell (head, nav, footer) is copied from how-we-work/index.html, so the blog follows
// any change to the shared markup on the next build.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'blog-src');
const BYLINE = 'By Alex Jenkinson, with support from Claude';
const ORIGIN = 'https://ideasquared.co.uk';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  middot: '·',
  pound: '£',
  ndash: '–',
  rarr: '→',
  nbsp: ' ',
};
const unescape = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#')
      return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e] ?? m;
  });
const attr = (text) =>
  unescape(text.replace(/<[^>]+>/g, ''))
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/·/g, '&middot;');

export const formatDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const words = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

export function loadSchedule() {
  const schedule = JSON.parse(readFileSync(join(src, 'schedule.json'), 'utf8'));
  const posts = schedule.posts.map((entry, order) => {
    const meta = JSON.parse(readFileSync(join(src, 'posts', `${entry.slug}.json`), 'utf8'));
    const prose = readFileSync(join(src, 'posts', `${entry.slug}.html`), 'utf8').trim();
    if (!schedule.series.some((s) => s.key === meta.series))
      throw new Error(`${entry.slug}: unknown series ${meta.series}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date))
      throw new Error(`${entry.slug}: bad date ${entry.date}`);
    return {
      ...meta,
      ...entry,
      order,
      prose,
      minutes: Math.max(1, Math.round(words(prose) / 230)),
    };
  });
  return { ...schedule, posts };
}

function shell() {
  const page = readFileSync(join(root, 'how-we-work', 'index.html'), 'utf8');
  const [head, rest] = page.split('<main id="main">');
  return { head, tail: rest.split('</main>')[1] };
}

function wrap({ head, tail }, { title, description, path, bodyClass, article, body }) {
  const url = `${ORIGIN}${path}`;
  let h = head
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${description}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${description}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/<body class="[^"]*">/, `<body class="i2 ${bodyClass}">`);
  if (article) {
    h = h
      .replace(
        '<meta property="og:type" content="website">',
        '<meta property="og:type" content="article">',
      )
      .replace(
        '<link rel="canonical"',
        `<meta name="author" content="Alex Jenkinson, with support from Claude">\n<link rel="canonical"`,
      );
  }
  return `${h}<main id="main">\n\n${body.trim()}\n\n</main>${tail}`;
}

function postBody(post, { next, previous, seriesInfo, eyebrow }) {
  const pagerTarget = next ?? previous;
  const pagerLabel = next ? 'Next post' : 'Previous post';
  const second = post.tool
    ? { href: post.tool.href, label: 'The tool', title: post.tool.title }
    : {
        href: `/blog/#${seriesInfo.id}`,
        label: 'In this series',
        title: `More ${eyebrow.toLowerCase()}`,
      };
  const meta = [
    `<li>${BYLINE}</li>`,
    `<li><time datetime="${post.date}">${formatDate(post.date)}</time></li>`,
    `<li>${post.minutes} min read</li>`,
    post.covers && `<li>Covers ${post.covers}</li>`,
    post.repo && `<li><a href="${post.repo.url}">${post.repo.label}</a></li>`,
  ].filter(Boolean);
  const pager = [
    pagerTarget &&
      `  <a class="pager-card is-next" href="/blog/${pagerTarget.slug}/"><span class="pager-label">${pagerLabel}</span><span class="pager-title">${pagerTarget.title}</span></a>`,
    `  <a class="pager-card" href="${second.href}"><span class="pager-label">${second.label}</span><span class="pager-title">${second.title}</span></a>`,
  ].filter(Boolean);
  return `<article class="post" aria-labelledby="post-title">
<header class="subpage-hero">
  <div class="container">
    <span class="eyebrow signal">Blog &middot; ${eyebrow}</span>
    <h1 id="post-title">${post.title}</h1>
    <p>${post.lede}</p>
    <ul class="post-meta" aria-label="About this post">
      ${meta.join('\n      ')}
    </ul>
  </div>
</header>

<div class="container post-body">
<div class="prose">
${post.prose}
</div>

<nav class="post-pager" aria-label="More posts">
${pager.join('\n')}
</nav>
<p class="post-all"><a href="/blog/">All posts</a></p>
</div>
</article>`;
}

const card = (post) => `      <li class="post-card">
        <div class="entry-meta"><span class="chip">${post.chip}</span><time class="entry-date" datetime="${post.date}">${formatDate(post.date)}</time></div>
        <h3><a href="/blog/${post.slug}/">${post.title}</a></h3>
        <p>${post.summary}</p>
        <span class="post-card-foot">${post.minutes} min read<span aria-hidden="true">Read &rarr;</span></span>
      </li>`;

function indexBody(series, published) {
  const sections = series
    .map((s) => ({ ...s, posts: published.filter((p) => p.series === s.key) }))
    .filter((s) => s.posts.length)
    .map(
      (s) => `<section class="section blog-series" id="${s.id}" aria-labelledby="${s.id}-title">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Series &middot; ${s.posts.length} ${s.posts.length === 1 ? 'post' : 'posts'}</span>
      <h2 id="${s.id}-title">${s.heading}</h2>
      <p>${s.intro}</p>
    </div>
    <ol class="post-grid">
${s.posts.map(card).join('\n')}
    </ol>
  </div>
</section>`,
    );
  return `<section class="subpage-hero">
  <div class="container">
    <span class="eyebrow signal">Blog</span>
    <h1>Longer notes on how we build.</h1>
    <p>The <a href="/journal/">build log</a> lists every change in a line or two. The blog is for the longer story: why we built something, what went wrong and what we would do again. Written by Alex Jenkinson, with support from Claude.</p>
  </div>
</section>

${sections.join('\n\n')}`;
}

function sitemap() {
  const pages = ['/'];
  const walk = (dir) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      if (['node_modules', 'test', 'blog-src'].includes(entry.name)) continue;
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (existsSync(join(root, rel, 'index.html'))) pages.push(`/${rel}/`);
      walk(rel);
    }
  };
  walk('');
  const urls = pages
    .sort()
    .map((u) => `  <url>\n    <loc>${ORIGIN}${u}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Returns { files: Map<path, content>, remove: path[] } for the given day, without touching disk.
export function build(today) {
  const { series, posts } = loadSchedule();
  const published = posts
    .filter((p) => p.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  const page = shell();
  const files = new Map();
  published.forEach((post, i) => {
    const seriesInfo = series.find((s) => s.key === post.series);
    const body = postBody(post, {
      next: published[i + 1],
      previous: published[i - 1],
      seriesInfo,
      eyebrow: seriesInfo.eyebrow,
    });
    files.set(
      join('blog', post.slug, 'index.html'),
      wrap(page, {
        title: `${attr(post.title).replace(/\.$/, '')} &middot; ideaSquared`,
        description: attr(post.description),
        path: `/blog/${post.slug}/`,
        bodyClass: 'page-post',
        article: true,
        body,
      }),
    );
  });
  files.set(
    join('blog', 'index.html'),
    wrap(page, {
      title: 'Blog &middot; ideaSquared',
      description:
        'Longer notes on how ideaSquared builds: why we built something, what went wrong and what we would do again.',
      path: '/blog/',
      bodyClass: 'page-blog',
      body: indexBody(series, published),
    }),
  );
  const live = new Set(published.map((p) => p.slug));
  const known = new Set(posts.map((p) => p.slug));
  const existing = existsSync(join(root, 'blog'))
    ? readdirSync(join(root, 'blog'), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [];
  existing
    .filter((slug) => !known.has(slug))
    .forEach((slug) => {
      throw new Error(`blog/${slug}/ is not in blog-src/schedule.json`);
    });
  // A live post must not link to a post that is not live yet: the link would 404.
  published.forEach((post) => {
    for (const [, slug] of post.prose.matchAll(/href="\/blog\/([a-z0-9-]+)\//g)) {
      if (!live.has(slug))
        throw new Error(`${post.slug} (${post.date}) links to ${slug}, which is not live by then`);
    }
  });
  const remove = existing.filter((slug) => !live.has(slug)).map((slug) => join('blog', slug));
  return { files, remove, published };
}

function main(argv) {
  const check = argv.includes('--check');
  const at = argv.indexOf('--today');
  const today = at >= 0 ? argv[at + 1] : new Date().toISOString().slice(0, 10);
  const { files, remove, published } = build(today);
  if (check) {
    const stale = [...files].filter(
      ([path, text]) =>
        !existsSync(join(root, path)) || readFileSync(join(root, path), 'utf8') !== text,
    );
    const problems = [
      ...stale.map(([p]) => `${p} differs`),
      ...remove.map((p) => `${p} should not be published yet`),
    ];
    if (problems.length) {
      console.error(`Blog is out of date for ${today} (run: pnpm blog:build --today ${today}):`);
      problems.forEach((p) => console.error(`  ${p}`));
      process.exitCode = 1;
    }
    return;
  }
  remove.forEach((p) => rmSync(join(root, p), { recursive: true, force: true }));
  for (const [path, text] of files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  writeFileSync(join(root, 'sitemap.xml'), sitemap());
  console.log(`Built ${published.length} posts for ${today}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
