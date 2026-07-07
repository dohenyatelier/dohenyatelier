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

/* NB: work-card click-through + the "View case study" cursor pill used to
   live here — they're shared with /work/ and the case studies now, so the
   single copy is /js/workcards.js. */

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

  // Click (or any key — keyboard users can't click "anywhere") dismisses:
  // the logo floats up to its nav position. Guarded so it only runs once.
  let dismissed = false;
  const dismissSplash = () => {
    if (dismissed) return;
    dismissed = true;
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
  };
  splash.addEventListener('click', dismissSplash);
  window.addEventListener('keydown', dismissSplash);
}


/* ── Tagline: line mask reveal ──────────────────────────── */
/* autoSplit re-runs onSplit whenever the lines need to re-wrap (viewport
   resize, font load), so the copy shrinks and reflows live instead of staying
   frozen at its load-time break points until a reload. `mask: 'lines'` gives
   each line its own overflow-hidden clip for the slide-up reveal. */
SplitText.create('.tagline p', {
  type: 'lines',
  mask: 'lines',
  linesClass: 'line-wrap',
  autoSplit: true,
  onSplit: (self) => gsap.from(self.lines, {
    scrollTrigger: {
      trigger: '.tagline',
      start: 'top 80%',
    },
    y: 80,
    duration: 1.6,
    stagger: 0.2,
    ease: 'power4.out',
  }),
});

/* ── Services: headline + grid ──────────────────────────── */
SplitText.create('.services-headline', {
  type: 'lines',
  autoSplit: true,
  onSplit: (self) => gsap.from(self.lines, {
    scrollTrigger: {
      trigger: '.services',
      start: 'top 78%',
    },
    y: 24,
    opacity: 0,
    duration: 0.7,
    stagger: 0.12,
    ease: 'power3.out',
  }),
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

