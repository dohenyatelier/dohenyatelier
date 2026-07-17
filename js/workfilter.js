/* ── Work page category filters ──────────────────────────────────────────────
   Used on: /work/ only.

   The default view keeps the hand-composed asymmetric rows. Picking a category
   filter switches .work-rows into a single uniform grid (CSS: .is-filtering,
   which turns each .work-row into display:contents) and uses GSAP Flip to
   animate the change: non-matching cards fade + scale out, and the surviving
   cards smoothly reposition into the tidy grid. "All" restores the composed
   layout the same way.

   Depends on gsap.min.js + Flip.min.js (loaded before this file). No-ops safely
   if they're missing or if the filter UI isn't on the page. ── */
(function () {
  const rows = document.querySelector('.work-rows');
  const dropdown = document.querySelector('.work-dropdown');
  if (!rows || !dropdown) return;

  const trigger = dropdown.querySelector('.work-dropdown-trigger');
  const valueLabel = dropdown.querySelector('.work-dropdown-value');
  const menu = dropdown.querySelector('.work-dropdown-menu');
  const options = Array.from(dropdown.querySelectorAll('.work-dropdown-option'));

  const items = gsap.utils.toArray('.work-rows .work-item');
  const emptyNote = document.querySelector('.work-filter-empty');
  const hasFlip = typeof gsap !== 'undefined' && typeof Flip !== 'undefined';
  if (hasFlip) gsap.registerPlugin(Flip);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 'all';
  let flipToken = 0;   // bumped per transition so a rapid re-click can invalidate the old cleanup

  const matches = (item, filter) =>
    filter === 'all' || item.dataset.category === filter;

  function apply(filter) {
    if (filter === current) return;

    // Capture geometry BEFORE the layout changes so Flip can tween from it.
    const state = hasFlip && !reduceMotion ? Flip.getState(items) : null;
    // Old height, so we can animate the container's collapse/grow instead of
    // letting it snap (which yanks the footer up mid-transition).
    const oldHeight = state ? rows.getBoundingClientRect().height : 0;

    // Switch layout mode + card visibility.
    rows.classList.toggle('is-filtering', filter !== 'all');
    let visible = 0;
    items.forEach((item) => {
      const show = matches(item, filter);
      item.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    if (emptyNote) emptyNote.hidden = visible !== 0;

    current = filter;

    if (!state) return;   // reduced motion / no Flip: snap, don't animate.

    // Measure the settled height, then pin back to the old one so the footer
    // starts where it was and glides to its new position alongside the Flip.
    const newHeight = rows.getBoundingClientRect().height;
    gsap.set(rows, { height: oldHeight });

    const token = ++flipToken;

    Flip.from(state, {
      duration: 0.6,
      ease: 'power2.inOut',
      absolute: true,          // lets leaving cards animate without shoving the grid
      stagger: 0.03,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.85 },
          { opacity: 1, scale: 1, duration: 0.5, delay: 0.15, ease: 'power2.out' }
        ),
      onLeave: (els) =>
        gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4, ease: 'power2.in' }),
      // Release the locked height ONLY after Flip has returned the cards to
      // normal flow. Doing it when the height tween ends (Flip still running,
      // cards still position:absolute) collapses the grid to 0 for one frame
      // and flashes the footer up. Guarded so a rapid re-click can't clear the
      // height mid-way through a newer transition.
      onComplete: () => { if (token === flipToken) gsap.set(rows, { clearProps: 'height' }); },
    });

    // Glide the container height in step with the Flip. No self-cleanup here —
    // the Flip's onComplete owns releasing the height (see above).
    gsap.to(rows, {
      height: newHeight,
      duration: 0.6,
      ease: 'power2.inOut',
      overwrite: 'auto',       // a rapid re-click restarts the height glide cleanly
    });
  }

  /* ── Dropdown behaviour ──────────────────────────────────────────────────
     Open/close the menu, move a keyboard highlight, and on selection update the
     trigger label + the selected option, then run apply(). ── */
  let highlight = -1;   // index of the keyboard-highlighted option while open

  const isOpen = () => menu.classList.contains('is-open');

  function setHighlight(i) {
    highlight = i;
    options.forEach((opt, idx) => opt.classList.toggle('is-highlighted', idx === i));
    if (i >= 0) options[i].scrollIntoView({ block: 'nearest' });
  }

  function openMenu() {
    menu.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    // Start the highlight on the current selection.
    setHighlight(options.findIndex((o) => o.dataset.filter === current));
    document.addEventListener('click', onOutside, true);
  }

  function closeMenu({ focusTrigger = false } = {}) {
    menu.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    setHighlight(-1);
    document.removeEventListener('click', onOutside, true);
    if (focusTrigger) trigger.focus();
  }

  function onOutside(e) {
    if (!dropdown.contains(e.target)) closeMenu();
  }

  function select(option) {
    const filter = option.dataset.filter;
    valueLabel.textContent = option.textContent;
    options.forEach((opt) => {
      const on = opt === option;
      opt.classList.toggle('is-selected', on);
      opt.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    closeMenu({ focusTrigger: true });
    apply(filter);   // no-ops if filter === current
  }

  trigger.addEventListener('click', () => {
    isOpen() ? closeMenu() : openMenu();
  });

  options.forEach((opt) => {
    opt.addEventListener('click', () => select(opt));
    // Pointer hover keeps the keyboard highlight in sync (and vice-versa).
    opt.addEventListener('mousemove', () => setHighlight(options.indexOf(opt)));
  });

  // Keyboard: arrows/Home/End move highlight, Enter/Space pick, Esc closes.
  dropdown.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen()) return openMenu();
        setHighlight(Math.min(highlight + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen()) return openMenu();
        setHighlight(Math.max(highlight - 1, 0));
        break;
      case 'Home':
        if (isOpen()) { e.preventDefault(); setHighlight(0); }
        break;
      case 'End':
        if (isOpen()) { e.preventDefault(); setHighlight(options.length - 1); }
        break;
      case 'Enter':
      case ' ':
        if (isOpen() && highlight >= 0) { e.preventDefault(); select(options[highlight]); }
        break;
      case 'Escape':
        if (isOpen()) { e.preventDefault(); closeMenu({ focusTrigger: true }); }
        break;
    }
  });
})();
