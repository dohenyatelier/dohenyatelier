document.querySelectorAll('img').forEach(img => {
  if (img.closest('.nav, .splash, .footer, .mobile-menu, .hero')) return;
  if (img.classList.contains('expertise-img')) return;
  if (img.complete && img.naturalWidth > 0) return;

  const wrap = img.parentElement;
  wrap.classList.add('img-loading');
  img.style.opacity = '0';
  img.style.transition = 'opacity 0.4s ease';

  img.addEventListener('load', () => {
    wrap.classList.remove('img-loading');
    img.style.opacity = '1';
    setTimeout(() => { img.style.transition = ''; img.style.opacity = ''; }, 400);
  }, { once: true });

  img.addEventListener('error', () => {
    wrap.classList.remove('img-loading');
    img.style.transition = '';
    img.style.opacity = '';
  }, { once: true });
});
