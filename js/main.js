gsap.registerPlugin(ScrollTrigger, SplitText);

/* ── Hero slideshow ─────────────────────────────────────── */
(function () {
  const imgs = document.querySelectorAll('.hero-img');
  if (!imgs.length) return;
  let current = 0;
  function startSlideshow() {
    setTimeout(() => {
      setInterval(() => {
        imgs[current].classList.remove('hero-img--active');
        current = (current + 1) % imgs.length;
        imgs[current].classList.add('hero-img--active');
      }, 1000);
    }, 500);
  }
  document.addEventListener('splashDismissed', startSlideshow, { once: true });
})();

/* ── Work item links ────────────────────────────────────── */
document.querySelectorAll('.work-item').forEach(item => {
  item.style.cursor = 'pointer';
  item.addEventListener('click', () => {
    document.body.classList.remove('is-loaded');
    setTimeout(() => { window.location.href = item.dataset.href || '/comingsoon/'; }, 400);
  });
});

/* ── Custom cursor ──────────────────────────────────────── */
const label = document.getElementById('cursorLabel');

document.querySelectorAll('.work-img-wrap').forEach((el) => {
  const updateLabelPosition = (e) => {
    label.style.setProperty('--cx', e.clientX + 'px');
    label.style.setProperty('--cy', e.clientY + 'px');
  };
  el.addEventListener('mousemove', updateLabelPosition);
  el.addEventListener('mouseenter', (e) => {
    updateLabelPosition(e);
    label.classList.add('visible');
  });
  el.addEventListener('mouseleave', () => label.classList.remove('visible'));
});


/* ── Splash screen ──────────────────────────────────────── */
const splash = document.getElementById('splash');

if (sessionStorage.getItem('splashSeen')) {
  // Skip splash when navigating back within the same tab session
  splash.style.display = 'none';
  document.dispatchEvent(new Event('splashDismissed'));
} else {
  // Lock scroll while splash is visible
  document.body.style.overflow = 'hidden';

  // Logo fades in on load
  gsap.fromTo('.splash-logo',
    { opacity: 0, filter: 'blur(20px)' },
    {
      opacity: 1,
      filter: 'blur(0px)',
      duration: 1.4,
      ease: 'power2.out',
      delay: 0.3,
    }
  );

  gsap.to('.splash-hint', {
    opacity: 1,
    duration: 1,
    ease: 'power2.out',
    delay: 1.8,
  });

  // Click to dismiss — logo floats up to nav
  splash.addEventListener('click', () => {
    const splashLogo = document.querySelector('.splash-logo');
    const navLogo    = document.querySelector('.nav-logo-img');

    const splashRect = splashLogo.getBoundingClientRect();
    const navRect    = navLogo.getBoundingClientRect();

    const dx = (navRect.left + navRect.width  / 2) - (splashRect.left + splashRect.width  / 2);
    const dy = (navRect.top  + navRect.height / 2) - (splashRect.top  + splashRect.height / 2);
    const scale = navRect.height / splashRect.height;

    splashLogo.classList.remove('blink-2');

    gsap.to(splashLogo, {
      x: dx,
      y: dy,
      scale: scale,
      duration: 0.9,
      ease: 'power3.inOut',
    });

    gsap.to([splash, '.splash-hint'], {
      opacity: 0,
      duration: 0.5,
      delay: 0.6,
      ease: 'power2.in',
      onComplete: () => {
        splash.style.display = 'none';
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
        sessionStorage.setItem('splashSeen', '1');
        document.dispatchEvent(new Event('splashDismissed'));
      },
    });
  });
}


/* ── Tagline: line mask reveal ──────────────────────────── */
const taglineSplit = new SplitText('.tagline p', { type: 'lines', linesClass: 'line-wrap' });
new SplitText('.tagline p', { type: 'lines' });

gsap.set('.line-wrap', { overflow: 'hidden' });
gsap.set(taglineSplit.lines, { willChange: 'transform' });

gsap.from(taglineSplit.lines, {
  scrollTrigger: {
    trigger: '.tagline',
    start: 'top 80%',
  },
  y: 80,
  duration: 1.6,
  stagger: 0.2,
  ease: 'power4.out',
  clearProps: 'willChange',
});

/* ── Services: headline + grid ──────────────────────────── */
const servicesSplit = new SplitText('.services-headline', { type: 'lines' });

gsap.from(servicesSplit.lines, {
  scrollTrigger: {
    trigger: '.services',
    start: 'top 78%',
  },
  y: 24,
  opacity: 0,
  duration: 0.7,
  stagger: 0.12,
  ease: 'power3.out',
});

gsap.from('.service-item', {
  scrollTrigger: {
    trigger: '.services-grid',
    start: 'top 85%',
  },
  y: 20,
  opacity: 0,
  duration: 0.6,
  stagger: 0.1,
  ease: 'power2.out',
});

