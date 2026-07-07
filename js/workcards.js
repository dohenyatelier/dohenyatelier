/* ── Work cards (shared by every page that shows them) ───────────────────────
   Used on: home (Featured Works), /work/ (project grid), and every case
   study's More Work grid. ONE copy of the behaviour — this file replaced the
   three near-identical copies that used to live in main.js, casestudy.js, and
   an inline <script> on /work/. Edit here and every page picks it up.

   What it does:
     • whole card is the click target — reads data-href, falls back to
       /comingsoon/, and runs the site's 400ms fade-out before navigating;
     • keyboard access: cards are focusable and open with Enter or Space
       (they're <div>s, not <a>s, so this doesn't come for free);
     • "View case study" cursor pill follows the pointer over card images —
       hover-capable devices only (CSS also hides it on touch);
     • More Work expanding panels (case studies): hovering a collapsed panel
       makes it the large one; the active state persists after the cursor
       leaves so the layout shows which project was last hovered.

   No-ops safely on pages without work cards. ── */
(function () {
  const items = document.querySelectorAll('.work-item');
  if (!items.length) return;

  const go = (item) => {
    document.body.classList.remove('is-loaded');   // fade out…
    setTimeout(() => { window.location.href = item.dataset.href || '/comingsoon/'; }, 400);   // …then navigate
  };

  items.forEach((item) => {
    item.style.cursor = 'pointer';
    item.setAttribute('role', 'link');
    item.setAttribute('tabindex', '0');
    item.addEventListener('click', () => go(item));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(item); }
    });
  });

  /* More Work: expanding-panel hover gallery. Desktop pointer only — on touch
     there's no hover and the CSS keeps the panels stacked (or static). */
  const panels = document.querySelectorAll('.more-work .work-item');
  if (panels.length && window.matchMedia('(hover: hover) and (min-width: 769px)').matches) {
    panels.forEach((panel) => {
      panel.addEventListener('mouseenter', () => {
        panels.forEach((p) => p.classList.toggle('is-active', p === panel));
      });
    });
  }

  /* Cursor pill. Gated to hover-capable devices: on touch a tap fires a
     synthetic mouseenter, which would leave the pill stuck on screen. */
  const label = document.getElementById('cursorLabel');
  if (!label || !window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('.work-img-wrap').forEach((el) => {
    const move = (e) => {
      label.style.setProperty('--cx', e.clientX + 'px');
      label.style.setProperty('--cy', e.clientY + 'px');
    };
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseenter', (e) => { move(e); label.classList.add('visible'); });
    el.addEventListener('mouseleave', () => label.classList.remove('visible'));
  });
})();
