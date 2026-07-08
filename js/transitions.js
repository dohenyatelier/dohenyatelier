// Fade the page in. `pageshow` fires on normal loads AND on back/forward
// bfcache restores (where DOMContentLoaded does not), so the page is never
// left stuck at opacity:0 after the back button.
window.addEventListener('pageshow', () => {
  document.body.classList.add('is-loaded');
});

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-loaded');

  // Underline whichever nav item matches the current page. Links with a
  // hash (e.g. "Expertise" → /about/#expertise) point at a section of a
  // page rather than a distinct destination, so they're excluded — only
  // "About" should light up on /about/, not both.
  document.querySelectorAll('.nav-link').forEach(link => {
    const url = new URL(link.href, window.location.href);
    if (!url.hash && url.pathname === window.location.pathname) {
      link.classList.add('is-active');
    }
  });

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#')) {
      link.addEventListener('click', e => {
        // Let the browser handle modifier-clicks (open in new tab/window) and
        // non-primary buttons instead of hijacking them into a same-tab nav.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

        // Same-page hash link (e.g. "Expertise" → /about/#expertise while
        // already on /about/): scroll to the section via Lenis instead of
        // fading out and reloading the whole page.
        const url = new URL(link.href, window.location.href);
        if (url.pathname === window.location.pathname && url.hash) {
          const target = document.querySelector(url.hash);
          if (target) {
            e.preventDefault();
            if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(target);
            else target.scrollIntoView();
            return;
          }
        }

        e.preventDefault();
        document.body.classList.remove('is-loaded');
        setTimeout(() => { window.location.href = href; }, 400);
      });
    }
  });
});
