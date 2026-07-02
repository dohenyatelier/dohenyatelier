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

  /* More Work: expanding-panel hover gallery. Hovering a collapsed panel makes
     it the large one; siblings collapse. The active state PERSISTS after the
     cursor leaves (we only act on enter, never on leave) so the layout shows
     which project was last hovered. Desktop only — on touch there's no hover and
     the CSS keeps the panels stacked. */
  const panels = document.querySelectorAll('.more-work .work-item');
  if (panels.length && window.matchMedia('(min-width: 769px)').matches) {
    panels.forEach((panel) => {
      panel.addEventListener('mouseenter', () => {
        panels.forEach((p) => p.classList.toggle('is-active', p === panel));
      });
    });
  }

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


/* ═══════════════════════════════════════════════════════════════════════════
   CASE-STUDY HEADER + HERO BEHAVIOURS
   Moved out of each case study's inline <script> so every case study page shares
   ONE copy of this logic — edit an animation here once and it updates on every
   page. Each block guards its own elements (early-returns if they're absent), so
   the whole section is inert on pages that don't have a case-study header.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Meta alignment: line the Client / Services columns up under the Expertise
   and Contact nav links, and give the header body a min-height so the
   absolutely-positioned meta never overlaps the description. ── */
function alignMeta() {
  // Mobile: meta flows normally (CSS), and the nav links it aligns to are
  // hidden — so skip the desktop column math entirely.
  if (window.innerWidth <= 768) return;
  const meta = document.querySelector('.cs-meta');
  if (!meta) return;                       // not a case-study header — nothing to align
  const navLinks = document.querySelectorAll('.nav-link');
  const expertise = navLinks[2];
  const contact   = navLinks[3];
  const metaLeft  = meta.getBoundingClientRect().left;

  const eLeft = expertise.getBoundingClientRect().left - metaLeft;
  const cLeft = contact.getBoundingClientRect().left - metaLeft;

  document.documentElement.style.setProperty('--cs-col-client',   eLeft + 'px');
  document.documentElement.style.setProperty('--cs-col-services', cLeft + 'px');

  const metaHeight = Math.max(
    document.querySelector('.cs-meta-col:first-child').offsetHeight,
    document.querySelector('.cs-meta-col:last-child').offsetHeight
  );
  const descHeight = document.querySelector('.cs-desc').offsetHeight;
  document.querySelector('.cs-header-body').style.minHeight =
    Math.max(metaHeight, descHeight) + 'px';
}

document.addEventListener('DOMContentLoaded', alignMeta);
document.fonts.ready.then(alignMeta);
window.addEventListener('resize', alignMeta);

/* ── View More: expand a 50% left panel, shrinking the hero column ── */
(function () {
  const wrap = document.getElementById('csExpand');
  const btn  = document.getElementById('csViewMore');
  if (!wrap || !btn) return;
  const panel = wrap.querySelector('.cs-expand-panel');
  const copyEl = wrap.querySelector('.cs-expand-panel-inner');
  const label = btn.querySelector('.cs-viewmore-label');

  // Mobile: the panel is a plain in-flow toggle (CSS). Skip the sticky-pin
  // and scroll-hold machinery — it assumes the desktop side-by-side layout
  // and the width animation, neither of which exists on mobile.
  const isMobile = window.innerWidth <= 768;

  // Sticky toggle: the button rides the page from its home spot, then pins
  // just below the nav once it reaches that line (JS-driven because its
  // flow parent is too short for CSS position:sticky to travel).
  const nav     = document.querySelector('.nav');
  const navLine = (nav ? nav.offsetHeight : 80) + 16;
  document.documentElement.style.setProperty('--cs-stuck-top', navLine + 'px');
  let homeTop = null;

  function measureHome() {
    // Read the button's natural (flow) document position. If it's currently
    // pinned, briefly drop the pin to measure, then restore it. Otherwise,
    // once homeTop gets reset to null while stuck (fonts.ready / resize fire
    // while you're scrolled down — common now the page is tall), the old
    // early-return meant it could never be re-measured, so the pin condition
    // stayed true forever and the button floated at the top of the page even
    // after scrolling back up.
    const wasStuck = btn.classList.contains('is-stuck');
    if (wasStuck) { btn.classList.remove('is-stuck'); btn.style.top = ''; }
    homeTop = btn.getBoundingClientRect().top + window.scrollY;
    if (wasStuck) btn.classList.add('is-stuck');
  }

  function updateStick() {
    if (homeTop === null) measureHome();
    if (homeTop - window.scrollY <= navLine) {
      // Pinned below the nav so it's reachable while scrolling. Bounded by
      // the bottom of the left COPY when open (rides up as the copy ends),
      // or by the whole 2-col SECTION when closed (stays available over the
      // heroes, then releases before the deliverables).
      const boundEl = wrap.classList.contains('expanded') ? copyEl : wrap;
      const boundBottom = boundEl.getBoundingClientRect().bottom;
      btn.classList.add('is-stuck');
      btn.style.top = Math.min(navLine, boundBottom - btn.offsetHeight) + 'px';
    } else {
      btn.classList.remove('is-stuck');
      btn.style.top = '';
      measureHome();
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { updateStick(); ticking = false; });
  }
  if (!isMobile) {
    window.addEventListener('scroll', onScroll, { passive: true });
    if (window.lenis && window.lenis.on) window.lenis.on('scroll', onScroll);
    window.addEventListener('resize', function () { homeTop = null; updateStick(); });
    updateStick();
    document.fonts.ready.then(function () { homeTop = null; updateStick(); });
  }

  // Toggling resizes the hero column over 0.8s, changing page height —
  // opening shrinks it (heroes go half-width), closing grows it back. Hold
  // your *proportional* spot within the section so the viewport stays on the
  // same content: if the top sits 60% of the way through the heroes, it stays
  // at 60% as the height animates. This must run on BOTH open and close —
  // holding only on open let each close grow the section back underneath a
  // fixed scroll position, walking you up the page over repeated toggles.
  function holdProportional() {
    const rect0 = wrap.getBoundingClientRect();
    const wrapTopDoc = rect0.top + window.scrollY;
    if (window.scrollY <= wrapTopDoc - navLine) return;  // above the section; nothing to hold
    // 0 = viewport top at the section top, 1 = at the section bottom.
    const frac = Math.max(0, Math.min(1, (window.scrollY - wrapTopDoc) / rect0.height));
    const start = performance.now();
    (function hold(now) {
      const y = wrapTopDoc + frac * wrap.getBoundingClientRect().height;
      if (Math.abs(y - window.scrollY) > 0.5) {
        if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      }
      if ((now || performance.now()) - start < 880) requestAnimationFrame(hold);
    })(start);
  }

  btn.addEventListener('click', function () {
    const opening = !wrap.classList.contains('expanded');
    if (opening) {
      wrap.classList.add('expanded');
      btn.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      label.textContent = 'Close';
      if (!isMobile) {
        holdProportional();
        measureHome();
        updateStick();
      }
    } else {
      wrap.classList.remove('expanded');
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      label.textContent = 'Learn More';
      if (!isMobile) {
        holdProportional();
        updateStick();   // re-evaluate: stay pinned if still scrolled past the nav
      }
    }
  });

  // Hero column changes height when the panel opens/closes — keep the
  // deliverables stacking in sync once the width animation settles.
  wrap.addEventListener('transitionend', function (e) {
    if (e.target !== panel || e.propertyName !== 'flex-basis') return;
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
})();

/* ── YouTube facade: swap the poster for the real iframe on click, so the heavy
   iframe only loads when the visitor actually wants to watch. The video ID lives
   in the page markup (data-id on #ytFacade), the behaviour lives here. ── */
(function () {
  const facade = document.getElementById('ytFacade');
  if (!facade) return;
  facade.addEventListener('click', function () {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + facade.dataset.id + '?autoplay=1&rel=0';
    iframe.title = 'YouTube video player';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);   // sized by the existing .cs-youtube-video iframe rule
  });
})();
