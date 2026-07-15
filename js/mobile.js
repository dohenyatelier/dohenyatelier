document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('navHamburger');
  const menu = document.getElementById('mobileMenu');
  const closeBtn = document.getElementById('mobileMenuClose');
  const root = document.documentElement;

  // Landed here from a menu tap: the panel carried over the navigation and is
  // covering this page, wiping up on its own via CSS. Drop the class once it
  // lands — a filled animation outranks .mobile-menu.open's transform, so
  // leaving it on would pin the panel off-screen and kill the hamburger.
  if (root.classList.contains('menu-wipe-in')) {
    document.body.classList.add('is-loaded');
    const clearWipe = () => root.classList.remove('menu-wipe-in');
    if (menu) menu.addEventListener('animationend', clearWipe, { once: true });
    setTimeout(clearWipe, 1000);  // no animation to end at desktop widths
  }

  if (!hamburger || !menu) return;

  const closeMenu = () => {
    menu.classList.remove('open');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', () => {
    menu.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  closeBtn.addEventListener('click', closeMenu);

  // Back button restoring this page from bfcache would otherwise bring back
  // the still-open panel we navigated away under.
  window.addEventListener('pageshow', e => { if (e.persisted) closeMenu(); });

  // Tapping a menu item hands the wipe to the destination: leave the panel up
  // as cover, navigate immediately, and let the next page wipe it away to
  // reveal itself. Capture phase + stopPropagation keeps transitions.js from
  // fading this page out behind the panel.
  menu.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) return;

    e.preventDefault();
    e.stopPropagation();
    // If this throws (Safari private mode), the destination just loads with
    // its normal fade instead of the wipe.
    try { sessionStorage.setItem('da-menu-wipe', '1'); } catch (err) {}
    window.location.href = href;
  }, true);
});
