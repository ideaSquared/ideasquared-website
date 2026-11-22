(() => {
  // Mobile nav toggle
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Mark the current section in the nav
  const path = location.pathname;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (path.indexOf(a.getAttribute('data-nav')) === 0) a.setAttribute('aria-current', 'page');
  });
})();
