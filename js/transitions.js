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
