(() => {
  // ---- Edit ventures here ------------------------------------------------
  // Each entry becomes a card on /ventures/ and on the home page.
  // slug:    URL segment under /ventures/<slug>/
  // chip:    short stage label shown on the card
  // focus:   true for the one venture the studio is focused on
  // stopped: true for ventures we have stopped working on (shown, not hidden)
  // Only claim what we can back with a dated source.
  const VENTURES = [
    {
      name: 'AdoptDontShop',
      slug: 'adopt-dont-shop',
      chip: 'Project · beta Q1 2027',
      meta: 'Pet adoption · UK',
      desc: 'Rescues list animals once. Adopters search and apply in one place. The core service is free for rescues, and the code is open source.',
      focus: true,
    },
    {
      name: 'CreatrGrid',
      slug: 'creatrgrid',
      chip: 'Live alpha',
      meta: 'Creator tools',
      desc: 'A personal site for content creators that updates itself. Connect YouTube, TikTok, Instagram and Twitch, and new posts appear on your page.',
    },
    {
      name: 'Pairflix',
      slug: 'pairflix',
      chip: 'Idea · prototype',
      meta: 'Streaming · households',
      desc: 'Helps two people agree on what to watch. No public users and no launch date yet.',
    },
    {
      name: 'gaminginit',
      slug: 'gaminginit',
      chip: 'Stopped · 21 Nov 2026',
      meta: 'Gaming community',
      desc: 'A community site and Discord bot for a game server. The game lost popularity and keeping a big enough player base became difficult, so we stopped.',
      stopped: true,
    },
  ];
  // -----------------------------------------------------------------------

  const FOCUS = VENTURES.filter((v) => v.focus);
  const OTHERS = VENTURES.filter((v) => !v.focus && !v.stopped);
  const STOPPED = VENTURES.filter((v) => v.stopped);

  function cardHtml(v) {
    const cls = 'project-card' + (v.focus ? ' is-focus' : '') + (v.stopped ? ' is-stopped' : '');
    const chip = 'chip' + (v.focus ? ' signal' : '') + (v.stopped ? ' stopped' : '');
    return '<a class="' + cls + '" href="/ventures/' + v.slug + '/">'
      + '<div class="project-top">'
        + '<span class="' + chip + '">' + v.chip + '</span>'
        + '<span class="project-meta">' + v.meta + '</span>'
      + '</div>'
      + '<h3 class="project-name">' + v.name + '</h3>'
      + '<p class="project-desc">' + v.desc + '</p>'
      + '<div class="project-foot">Read the venture page →</div>'
    + '</a>';
  }

  function fill(id, list) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = list.map(cardHtml).join('\n');
  }

  function render() {
    fill('focus-grid', FOCUS);          // /ventures/: the focus venture
    fill('venture-grid', OTHERS);       // /ventures/: everything else in build
    fill('deprecated-grid', STOPPED);   // /ventures/: stopped ventures
    fill('project-grid', OTHERS.concat(STOPPED)); // home: beyond the focus venture

    const fl = document.getElementById('footer-ventures');
    if (fl) {
      fl.innerHTML = VENTURES.map((v) =>
        '<li><a href="/ventures/' + v.slug + '/">' + v.name + (v.stopped ? ' (stopped)' : '') + '</a></li>'
      ).join('\n');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
