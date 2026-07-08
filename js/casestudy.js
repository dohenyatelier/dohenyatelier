gsap.registerPlugin(ScrollTrigger);

/* ── Back-button / bfcache safety net ────────────────────────────────────────
   Case study pages load transitions.js (which owns the page fade-in/out), but
   keep this one-line re-assert as insurance: if a future page loads this file
   without transitions.js, a Back-button bfcache restore would otherwise bring
   the page back with `is-loaded` missing — body stuck at opacity:0 (blank). ── */
window.addEventListener('pageshow', () => document.body.classList.add('is-loaded'));

/* ── Deliverables: images scroll normally (no pin). Left headers are sticky
   and STACK — each header pins below the nav and below the headers already
   pinned above it, so they accumulate while the images scroll past. Each row's
   description expands while its image is centred and collapses otherwise.
   NB: .cs-row is display:contents, so it has no box — trigger/scroll off the
   image (.cs-row-right) instead of the row. */
/* Mobile (≤768px) gets a static single-column stack via CSS — the sticky
   stacking + collapse-out logic below is disabled so it doesn't set inline
   heights that fight the mobile layout. */
if (document.querySelector('.cs-deliverables')) {
  const rows = gsap.utils.toArray('.cs-row');

  // Desktop-only behaviour, evaluated LIVE (not just at load). Checking the
  // breakpoint on every resync means a device that loads narrow (iPad portrait
  // = 768) and is then rotated to landscape (>768) picks up the sticky-stacking
  // instead of piling every header at the same top offset — and the reverse
  // (wide → narrow without reload) tears the inline styles back down.
  const isDesktop = () => window.innerWidth > 768;

  // Drop any inline styles the desktop logic set, so on mobile the JS never
  // fights the static single-column CSS layout.
  const clearDesktopInline = () => {
    rows.forEach((row) => {
      const left = row.querySelector('.cs-row-left');
      const body = row.querySelector('.cs-row-body');
      if (left) left.style.top = '';
      if (body) gsap.set(body, { clearProps: 'height,paddingTop' });
    });
  };

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
  const exitTweens = new WeakMap();   // running collapse tween per row, so we can kill it on reverse
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
      // Height only — paddingTop stays 16 in both states, so the title→text gap is
      // frozen and the text never rides up as the body wipes closed. No opacity:
      // the muted description look comes from .cs-row-desc's own CSS opacity.
      const COLLAPSED = { height: 0, paddingTop: 16 };
      const SHOWN     = { height: 'auto', paddingTop: 16 };
      const killExit = () => { const t = exitTweens.get(row); if (t) t.kill(); };
      if (animate) {
        // Live scroll: only act on a transition; animate the collapse, snap open.
        // (gsap tweens need the RAF ticker, which live scroll has.)
        if (was === shouldCollapse) return;
        killExit();
        if (shouldCollapse) {
          // Wipe up: NO fade, HEIGHT ONLY (paddingTop is frozen at 16). The body
          // rolls up from the bottom — content is top-anchored and clipped by the
          // body's overflow:hidden, so the bottom clips while the top line holds
          // its gap below the title instead of drifting up into the pinned header.
          exitTweens.set(row, gsap.to(body, { height: 0, duration: 0.5, ease: 'power3.inOut' }));
        } else {
          gsap.set(body, SHOWN);
        }
      } else {
        // Snap (load / resize / scroll-restoration): ALWAYS assert the correct
        // state instantly. Never skip on prior state — an interrupted or
        // not-yet-ticked animation can leave the DOM out of sync with it — and
        // use set() so it doesn't depend on a ticker frame having run.
        killExit();
        gsap.set(body, shouldCollapse ? COLLAPSED : SHOWN);
      }
    });
  };

  // Live scroll: animate state changes. Lenis emits 'scroll' every frame while
  // scrolling AND when its RAF loop notices a programmatic/restored position, so
  // this also catches the browser restoring scroll on a mid-page reload (native
  // 'scroll' events don't fire here — Lenis suppresses them).
  if (window.lenis) window.lenis.on('scroll', () => { if (isDesktop()) syncDescriptions(true); });

  // Layout passes: recompute sticky offsets and snap descriptions instantly.
  // On mobile, tear down any desktop inline styles and stop — the CSS owns the
  // static stack there.
  const resync = () => {
    if (!isDesktop()) { clearDesktopInline(); return; }
    stackHeaders();
    syncDescriptions(false);
  };
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

/* NB: the More Work grid's click-through, expanding panels, and cursor pill
   used to live here — they're shared with home and /work/ now, so the single
   copy is /js/workcards.js (loaded by every page with work cards). */


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

/* ── Deliverable-card image slideshow: any image slot can be replaced with a
   `.cs-row-slideshow` wrapper containing multiple <img>s; they auto-advance
   with a crossfade. Reusable across any card/page — just swap a plain <img>
   for the wrapper markup in the page HTML, no per-page JS needed. Pauses on
   hover so a visitor can rest on a single frame. ── */
document.querySelectorAll('.cs-row-slideshow').forEach(function (el) {
  const imgs = el.querySelectorAll('img');
  if (imgs.length < 2) return;
  let i = 0;
  let timer = null;
  const advance = function () {
    imgs[i].classList.remove('is-active');
    i = (i + 1) % imgs.length;
    imgs[i].classList.add('is-active');
  };
  const start = function () {
    if (timer) return;
    timer = setInterval(advance, 1200);
  };
  const stop = function () {
    clearInterval(timer);
    timer = null;
  };
  start();
  // Hover-to-pause is a pointer affordance only. On touch devices a tap fires
  // a synthetic mouseenter (sticky hover), which would pause the slideshow and,
  // with the CSS zoom, re-trigger on every slide change — so skip it entirely
  // where there's no real hover. Also skip it for full-width slideshows that
  // fill the viewport (e.g. the mechanical frame): the cursor is essentially
  // always over them, so hover-pause would keep them permanently frozen.
  if (window.matchMedia('(hover: hover)').matches && !el.classList.contains('cs-mechanical')) {
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
  }
});

/* ── Hero / campaign video: starts playing only once the visitor scrolls to
   it, not on page load. Markup should NOT carry the `autoplay` attribute —
   this observer calls .play() the first time the video crosses into view,
   then stops watching. Applies to any .cs-hero-video, .cs-youtube-video, or
   .cs-campaign-video local <video> on any case study page. ── */
document.querySelectorAll('.cs-hero-video video, .cs-youtube-video video, .cs-campaign-video video').forEach(function (video) {
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        video.play();
        io.unobserve(video);
      }
    });
  }, { threshold: 0.5 });
  io.observe(video);
});
