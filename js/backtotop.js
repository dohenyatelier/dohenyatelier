/* ── Scroll-to-top button (global) ───────────────────────────────────────────
   The donut button (.cs-totop) lives on every page. This:
     • fades/rolls it in once the page has been scrolled ~a third of a screen
       (nothing to scroll up to at the very top);
     • toggles .on-dark while it overlaps a dark-background section (the footer,
       or anything tagged [data-totop-dark]) so it inverts and stays visible;
     • scrolls smoothly to the top on click via Lenis (the #cs-top anchor is the
       no-JS fallback).
   Lenis suppresses native scroll events, so state syncs on the Lenis 'scroll'
   event; the native listener is a fallback. No-ops on pages without the button
   (currently none, but it stays safe). ── */
(function () {
  const btn = document.querySelector('.cs-totop');
  if (!btn) return;

  const dark = Array.prototype.slice.call(document.querySelectorAll('.footer, [data-totop-dark]'));
  const sync = () => {
    btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.35);
    const r = btn.getBoundingClientRect();
    const onDark = dark.some(function (el) {
      const s = el.getBoundingClientRect();
      return s.top < r.bottom && s.bottom > r.top;   // vertical overlap with the button
    });
    btn.classList.toggle('on-dark', onDark);
  };
  sync();
  if (window.lenis && window.lenis.on) window.lenis.on('scroll', sync);
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);

  // Smooth scroll to top via Lenis; fall back to the native #cs-top anchor.
  btn.addEventListener('click', function (e) {
    if (window.lenis && window.lenis.scrollTo) {
      e.preventDefault();
      // force: true runs the tween even when Lenis has auto-toggled itself off
      // (common on mobile, where it doesn't drive touch scrolling) — otherwise
      // the scroll stops a bit shy of the very top. lock: true keeps residual
      // touch momentum from interrupting it before it lands at 0.
      window.lenis.scrollTo(0, { force: true, lock: true });
    }
  });
})();
