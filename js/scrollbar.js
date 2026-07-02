/* ── Custom overlay scrollbar ────────────────────────────────────────────────
   A thin beige thumb pinned to the right edge (styles in .da-scrollbar /
   .da-scrollbar-thumb). Behaviour:
     • hidden by default;
     • reveals while scrolling and fades out once scrolling stops (idle);
     • reveals when the pointer nears the right edge and stays while it's there;
     • the thumb is draggable to scroll.
   Driven by Lenis scroll position (window.lenis, exposed on every page); reads
   window.scrollY, which Lenis keeps in sync, so it's framework-agnostic. The
   native scrollbar is hidden in CSS. Skipped on touch devices — they have no
   persistent pointer and their native scrollbars already auto-hide. ── */
(function () {
  if (window.matchMedia('(hover: none)').matches) return;

  const MIN_THUMB = 40;   // px — keep the thumb grabbable on very long pages
  const EDGE      = 28;   // px — right-edge hover zone that reveals the bar
  const IDLE      = 700;  // ms of no scrolling before it fades out

  const bar   = document.createElement('div');
  bar.className = 'da-scrollbar';
  const thumb = document.createElement('div');
  thumb.className = 'da-scrollbar-thumb';
  bar.appendChild(thumb);
  (document.body || document.documentElement).appendChild(bar);

  let nearEdge  = false;
  let dragging  = false;
  let hideTimer = 0;
  let dragOffset = 0;

  const scrollable = () =>
    document.documentElement.scrollHeight - window.innerHeight > 2;

  function metrics() {
    const winH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const max  = docH - winH;
    const thumbH = Math.max(MIN_THUMB, winH * (winH / docH));
    const y = max > 0 ? (window.scrollY / max) * (winH - thumbH) : 0;
    return { winH, thumbH, y, max };
  }

  function render() {
    if (!scrollable()) { bar.classList.remove('is-visible'); return; }
    const m = metrics();
    thumb.style.height = m.thumbH + 'px';
    thumb.style.transform = 'translateY(' + m.y + 'px)';
  }

  function show() { bar.classList.add('is-visible'); }
  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (!nearEdge && !dragging) bar.classList.remove('is-visible');
    }, IDLE);
  }

  // Scroll: reposition + reveal, then fade after it settles. Lenis emits
  // 'scroll' every frame while scrolling (native 'scroll' is suppressed under
  // Lenis); fall back to the native event if Lenis isn't present.
  function onScroll() {
    render();
    if (scrollable()) { show(); scheduleHide(); }
  }
  if (window.lenis && window.lenis.on) window.lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', onScroll, { passive: true });

  // Right-edge hover: reveal and hold while the pointer stays in the zone.
  window.addEventListener('mousemove', function (e) {
    nearEdge = e.clientX >= window.innerWidth - EDGE;
    if (nearEdge && scrollable()) { render(); show(); }
    else scheduleHide();
  });
  // Pointer left the page entirely — drop the hold and let it fade.
  document.addEventListener('mouseleave', function () { nearEdge = false; scheduleHide(); });

  // Drag the thumb to scroll.
  thumb.addEventListener('pointerdown', function (e) {
    dragging = true;
    dragOffset = e.clientY - thumb.getBoundingClientRect().top;
    try { thumb.setPointerCapture(e.pointerId); } catch (_) {}
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  thumb.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const m = metrics();
    const track = m.winH - m.thumbH;
    const top = Math.min(Math.max(0, e.clientY - dragOffset), track);
    const target = track > 0 ? (top / track) * m.max : 0;
    if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(target, { immediate: true });
    else window.scrollTo(0, target);
    show();
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    if (e) { try { thumb.releasePointerCapture(e.pointerId); } catch (_) {} }
    scheduleHide();
  }
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', render);
  window.addEventListener('load', render);
  document.addEventListener('DOMContentLoaded', render);
  render();
})();
