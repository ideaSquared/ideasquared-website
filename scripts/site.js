(() => {
  // ---- Theme toggle ---------------------------------------------------
  // States: "auto" (follow OS), "light", "dark".
  // Stored only when the user makes an explicit choice; absence == auto.
  const THEME_KEY = 'i2-theme';
  const root = document.documentElement;
  const stored = (() => {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  })();
  const initial = stored === 'light' || stored === 'dark' ? stored : 'auto';
  root.setAttribute('data-theme', initial);

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const resolved = () => {
    const t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mql.matches ? 'dark' : 'light';
  };

  const buttons = document.querySelectorAll('[data-theme-toggle]');
  const syncButtons = () => {
    const next = resolved() === 'dark' ? 'light' : 'dark';
    buttons.forEach((btn) => {
      btn.setAttribute('aria-label', `Switch to ${next} theme`);
      btn.setAttribute('title', `Switch to ${next} theme`);
      btn.setAttribute('aria-pressed', String(resolved() === 'dark'));
    });
  };
  syncButtons();

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = resolved() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      syncButtons();
    });
  });

  // Reflect OS changes while in auto mode.
  const onMqlChange = () => {
    if (root.getAttribute('data-theme') === 'auto') syncButtons();
  };
  if (mql.addEventListener) mql.addEventListener('change', onMqlChange);
  else if (mql.addListener) mql.addListener(onMqlChange);

  // Sync across tabs.
  window.addEventListener('storage', (e) => {
    if (e.key !== THEME_KEY) return;
    const t = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : 'auto';
    root.setAttribute('data-theme', t);
    syncButtons();
  });

  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const toggle = document.getElementById('nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const path = window.location.pathname.replace(/\/+$/, '/');
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && (path === href || (href !== '/' && path.startsWith(href)))) {
      a.classList.add('is-active');
    }
  });

  const grid = document.getElementById('project-grid');
  if (grid) {
    const buttons = document.querySelectorAll('.filter [data-filter]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        buttons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        grid.querySelectorAll('.project-card').forEach((card) => {
          const tag = card.dataset.tag;
          card.style.display = filter === 'All' || tag === filter ? '' : 'none';
        });
      });
    });
  }

})();
