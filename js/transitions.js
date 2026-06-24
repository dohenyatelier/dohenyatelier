// Fade the page in. `pageshow` fires on normal loads AND on back/forward
// bfcache restores (where DOMContentLoaded does not), so the page is never
// left stuck at opacity:0 after the back button.
window.addEventListener('pageshow', () => {
  document.body.classList.add('is-loaded');
});

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-loaded');

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.body.classList.remove('is-loaded');
        setTimeout(() => { window.location.href = href; }, 400);
      });
    }
  });
});
