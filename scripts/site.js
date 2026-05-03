(() => {
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
