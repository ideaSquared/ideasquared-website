(() => {
  // ---- Edit ventures here ------------------------------------------------
  // Each entry becomes a card on /ventures/ and on the home page.
  // slug: URL segment under /ventures/<slug>/
  // dark: true gives the card the dark style (alternates visually)
  const VENTURES = [
    {
      name: 'AdoptDontShop',
      slug: 'adopt-dont-shop',
      chip: 'Alpha · in build',
      meta: 'Pet adoption · UK',
      desc: 'A swipe-based pet adoption platform connecting UK rescue pets with the right humans. Free for adopters; SaaS for rescues; affiliate revenue from vets, insurers and food.',
      dark: false,
    },
    {
      name: 'Pairflix',
      slug: 'pairflix',
      chip: 'Alpha · in build',
      meta: 'Streaming · UK households',
      desc: 'An AI matcher that turns the nightly “what shall we watch?” argument into a 30-second decision — across Netflix, Prime, Disney+ and friends.',
      dark: true,
    },
    {
      name: 'CreatrGrid',
      slug: 'creatrgrid',
      chip: 'Alpha · in build',
      meta: 'Creator tools · global',
      desc: 'An automatically-updated personal website for content creators. Connect YouTube, TikTok and Instagram — your posts appear on your public page without any manual work.',
      dark: false,
    },
  ];
  // -----------------------------------------------------------------------

  const WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];

  function cardHtml(v, prefix) {
    return '<a class="project-card' + (v.dark ? ' dark' : '') + '" href="' + prefix + v.slug + '/" aria-label="' + v.name + ' — read the venture brief">'
      + '<div class="project-top">'
        + '<span class="chip">' + v.chip + '</span>'
        + '<span class="project-meta">' + v.meta + '</span>'
      + '</div>'
      + '<h3 class="project-name">' + v.name + '</h3>'
      + '<p class="project-desc">' + v.desc + '</p>'
      + '<div class="project-foot">'
        + '<span class="project-stake-label">Read</span>'
        + '<span class="project-stake-n">Venture brief →</span>'
      + '</div>'
    + '</a>';
  }

  function andList(arr) {
    if (arr.length <= 2) return arr.join(' & ');
    return arr.slice(0, -1).join(', ') + ' & ' + arr[arr.length - 1];
  }

  function render() {
    // Card grids
    var vg = document.getElementById('venture-grid');
    if (vg) vg.innerHTML = VENTURES.map(function(v) { return cardHtml(v, ''); }).join('\n');

    var pg = document.getElementById('project-grid');
    if (pg) pg.innerHTML = VENTURES.map(function(v) { return cardHtml(v, 'ventures/'); }).join('\n');

    // Footer ventures list
    var fl = document.getElementById('footer-ventures');
    if (fl) {
      fl.innerHTML = VENTURES.map(function(v) {
        return '<li><a href="/ventures/' + v.slug + '/">' + v.name + '</a></li>';
      }).join('\n') + '\n<li><a href="/ventures/">All ventures</a></li>';
    }

    // Stat: count number
    var sn = document.getElementById('stat-venture-count');
    if (sn) sn.textContent = String(VENTURES.length);

    // Stat: venture names note
    var note = document.getElementById('stat-venture-note');
    if (note) note.textContent = andList(VENTURES.map(function(v) { return v.name; })) + ' in build';

    // Any heading with data-venture-heading="{count} ..." gets {count} substituted
    var word = WORDS[VENTURES.length] !== undefined ? WORDS[VENTURES.length] : String(VENTURES.length);
    document.querySelectorAll('[data-venture-heading]').forEach(function(el) {
      el.textContent = el.getAttribute('data-venture-heading').replace('{count}', word);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
