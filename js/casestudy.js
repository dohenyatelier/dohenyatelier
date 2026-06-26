gsap.registerPlugin(ScrollTrigger);

/* ── Deliverables: images scroll normally (no pin). Left headers are sticky
   and STACK — each header pins below the nav and below the headers already
   pinned above it, so they accumulate while the images scroll past. Each row's
   description expands while its image is centred and collapses otherwise.
   NB: .cs-row is display:contents, so it has no box — trigger/scroll off the
   image (.cs-row-right) instead of the row. */
/* Mobile (≤768px) gets a static single-column stack via CSS — the sticky
   stacking + collapse-out logic below is disabled so it doesn't set inline
   heights that fight the mobile layout. */
if (document.querySelector('.cs-deliverables') && window.innerWidth > 768) {
  const rows = gsap.utils.toArray('.cs-row');

  // Give each sticky header an increasing top offset = nav height + the combined
  // (collapsed) height of every header pinned above it, so they stack instead of
  // overlapping. Measured from the header box only, so it's stable whether or not
  // a description happens to be open when this runs.
  const stackHeaders = () => {
    const nav  = document.querySelector('.nav');
    const navH = nav ? nav.offsetHeight : 80;
    let top = navH + 24;                       // breathing room below the nav
    rows.forEach((row) => {
      const left = row.querySelector('.cs-row-left');
      const hdr  = row.querySelector('.cs-row-hdr');
      const cs   = getComputedStyle(left);
      left.style.top = top + 'px';
      top += parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth)
           + hdr.offsetHeight + parseFloat(cs.paddingBottom);
    });
  };

  // Each row's description is visible while its image is in view, and collapses
  // once the image's bottom scrolls above the viewport centre (where the card
  // "pins"). Collapsing animates while you scroll; every other path snaps.
  //
  // Driven by LIVE geometry (getBoundingClientRect), NOT cached scroll positions.
  // The old version cached each trigger's start point with ScrollTrigger, and on
  // a mid-page reload that cache was built before the layout settled — the
  // browser restores scroll and the hero/fonts above reflow afterwards — so a
  // description would snap shut at the wrong position and never recover (the page
  // sits still, so nothing re-ran the snap). That was the "description disappears
  // on reload" bug. Reading geometry live can't go stale: for whatever the
  // current scroll and layout are, the state is recomputed correctly.
  const collapsed = new WeakMap();
  const syncDescriptions = (animate) => {
    const vh = window.innerHeight;
    if (!vh) return;                                       // ignore degenerate layout passes
    rows.forEach((row) => {
      // Collapse the whole body (description + product list), not just the desc.
      const body = row.querySelector('.cs-row-body');
      const img  = row.querySelector('.cs-row-right');
      if (!body || !img) return;
      const shouldCollapse = img.getBoundingClientRect().bottom < vh / 2;
      const was = collapsed.get(row);
      collapsed.set(row, shouldCollapse);
      // opacity 1 here so the body fades fully out/in; the muted look of the
      // description comes from its own CSS opacity (the product list stays full).
      const COLLAPSED = { height: 0, paddingTop: 0, opacity: 0 };
      const SHOWN     = { height: 'auto', paddingTop: 16, opacity: 1 };
      if (animate) {
        // Live scroll: only act on a transition; animate the collapse, snap open.
        // (gsap.to is a tween — it needs the RAF ticker, which live scroll has.)
        if (was === shouldCollapse) return;
        if (shouldCollapse) gsap.to(body, { ...COLLAPSED, duration: 0.5, ease: 'power2.out', overwrite: true });
        else gsap.set(body, SHOWN);
      } else {
        // Snap (load / resize / scroll-restoration): ALWAYS assert the correct
        // state instantly. Never skip on prior state — an interrupted or
        // not-yet-ticked animation can leave the DOM out of sync with it — and
        // use set() so it doesn't depend on a ticker frame having run.
        gsap.set(body, shouldCollapse ? COLLAPSED : SHOWN);
      }
    });
  };

  // Live scroll: animate state changes. Lenis emits 'scroll' every frame while
  // scrolling AND when its RAF loop notices a programmatic/restored position, so
  // this also catches the browser restoring scroll on a mid-page reload (native
  // 'scroll' events don't fire here — Lenis suppresses them).
  if (window.lenis) window.lenis.on('scroll', () => syncDescriptions(true));

  // Layout passes: recompute sticky offsets and snap descriptions instantly.
  const resync = () => { stackHeaders(); syncDescriptions(false); };
  resync();
  document.fonts.ready.then(resync);
  window.addEventListener('load', resync);
  window.addEventListener('resize', resync);

  // Late reflow (hero images decoding, web fonts swapping in) shifts geometry
  // after first paint; re-snap once it settles. Debounced so it doesn't fire on
  // every frame of a description's own collapse animation.
  if (window.ResizeObserver) {
    let roT;
    new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(resync, 120); }).observe(document.body);
  }

  // Click a title to scroll to the TOP of that card's first image, aligned with
  // where the card's header pins. (Centring no longer works now each card's image
  // column is two images tall — it would land you in the middle of the column.)
  rows.forEach((row) => {
    const hdr  = row.querySelector('.cs-row-hdr');
    const img  = row.querySelector('.cs-row-right');
    const left = row.querySelector('.cs-row-left');
    if (!hdr || !img || !left) return;
    hdr.addEventListener('click', () => {
      // Inert on mobile: the deliverables are a plain static stack there, so a
      // header tap must never scroll-jump. The block is already gated off at
      // load (innerWidth > 768), but guard live here too — if the page loaded
      // wide and was then narrowed without a reload, this listener stays
      // attached, which was the "clicking Lips still scrolls" bug on mobile.
      if (window.matchMedia('(max-width: 768px)').matches) return;
      // Header's sticky top = where it pins below the nav; landing the image top
      // there lines the first image up with its own pinned header.
      const top = parseFloat(getComputedStyle(left).top) || 0;
      if (window.lenis) {
        window.lenis.scrollTo(img, { offset: -top, duration: 1.0 });
      } else {
        img.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ── Work cards (e.g. the More Work grid): click-through + "View case study"
   cursor pill. Mirrors the homepage behaviour for case-study pages, which load
   this file instead of main.js. No-ops on pages without work cards. */
(function () {
  const items = document.querySelectorAll('.work-item');
  if (!items.length) return;

  items.forEach((item) => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      document.body.classList.remove('is-loaded');   // fade out, then navigate
      setTimeout(() => { window.location.href = item.dataset.href || '/comingsoon/'; }, 400);
    });
  });

  const label = document.getElementById('cursorLabel');
  if (!label) return;
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
