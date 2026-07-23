gsap.registerPlugin(ScrollTrigger, SplitText);

/* ── Hero slideshow ─────────────────────────────────────── */
(function () {
  const hero = document.querySelector('.hero');
  const imgs = document.querySelectorAll('.hero-img');
  if (!hero || !imgs.length) return;
  let current = 0;
  let timer = null;

  /* Dots nav — one button per slide, built here so it always matches the
     number of hero images. Clicking a dot jumps to that slide; autoplay keeps
     running but its timer is reset so it doesn't advance immediately after. */
  const dots = document.createElement('div');
  dots.className = 'hero-dots';
  dots.setAttribute('aria-label', 'Slideshow navigation');
  const buttons = Array.from(imgs).map((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hero-dot';
    b.setAttribute('aria-label', 'Go to ' + (img.getAttribute('alt') || 'slide ' + (i + 1)));
    b.addEventListener('click', (e) => {
      e.stopPropagation();          // don't trigger the slide's click-through
      goTo(i);
      restart();                    // reset autoplay so it doesn't jump right away
    });
    dots.appendChild(b);
    return b;
  });
  hero.appendChild(dots);

  /* Pause/play toggle — bottom-right, bottom-aligned with the dots. Lets
     viewers stop the autoplay when they need longer to read a thumbnail. */
  const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  let paused = false;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hero-toggle';
  toggle.innerHTML = PAUSE_ICON;
  toggle.setAttribute('aria-label', 'Pause slideshow');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    paused = !paused;
    if (paused) {
      clearInterval(timer);
      toggle.innerHTML = PLAY_ICON;
      toggle.setAttribute('aria-label', 'Play slideshow');
    } else {
      restart();
      toggle.innerHTML = PAUSE_ICON;
      toggle.setAttribute('aria-label', 'Pause slideshow');
    }
  });
  hero.appendChild(toggle);

  function goTo(i) {
    imgs[current].classList.remove('hero-img--active');
    buttons[current].classList.remove('is-active');
    current = i;
    imgs[current].classList.add('hero-img--active');
    buttons[current].classList.add('is-active');
    buttons[current].setAttribute('aria-current', 'true');
    buttons.forEach((b, j) => { if (j !== current) b.removeAttribute('aria-current'); });
  }
  buttons[0].classList.add('is-active');
  buttons[0].setAttribute('aria-current', 'true');

  const advance = () => goTo((current + 1) % imgs.length);
  function restart() {
    clearInterval(timer);
    if (paused) return;               // stay stopped while the user has paused
    timer = setInterval(advance, 2500);
  }
  function startSlideshow() {
    setTimeout(restart, 500);
  }
  document.addEventListener('splashDismissed', startSlideshow, { once: true });

  /* Click-through + "View case study" cursor pill on the hero slides.
     Mirrors the work-card behaviour (js/workcards.js) but the hero is a stack
     of absolutely-positioned <img>s, not .work-item cards, so it's wired here.
     Only the active slide takes pointer events (CSS), so a click always hits
     the visible image. Nautica has no case study yet → "Coming soon", no nav. */
  const go = (href) => {
    if (!href) return;
    document.body.classList.remove('is-loaded');            // fade out…
    setTimeout(() => { window.location.href = href; }, 400);  // …then navigate
  };

  imgs.forEach((img) => {
    img.addEventListener('click', () => go(img.dataset.href));
  });

  const label = document.getElementById('cursorLabel');
  if (label && window.matchMedia('(hover: hover)').matches) {
    const labelText = label.querySelector('.cursor-label-inner') || label;

    /* Preview thumbnail that trails the cursor UNDER the pill — home hero only.
       Built here (not shared with the site-wide pill) so it never appears on
       /work or the case studies. Reuses the slide's own image as the thumb. */
    const preview = document.createElement('div');
    preview.className = 'hero-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML =
      '<div class="hero-preview-inner">' +
        '<div class="hero-preview-thumb"><img alt="" /></div>' +
        '<div class="hero-preview-meta">' +
          '<h4 class="hero-preview-title"></h4>' +
          '<p class="hero-preview-desc"></p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(preview);
    const pImg = preview.querySelector('img');
    const pTitle = preview.querySelector('.hero-preview-title');
    const pDesc = preview.querySelector('.hero-preview-desc');

    /* Suppress the pill + preview when the pointer nears the dots nav or the
       pause/play toggle so the card doesn't cover — and the real cursor stays
       visible over — the controls the user is trying to click. */
    const nearControl = (e) => {
      const pad = 70;
      return [dots, toggle].some((el) => {
        const r = el.getBoundingClientRect();
        return e.clientX >= r.left - pad && e.clientX <= r.right + pad &&
               e.clientY >= r.top - pad && e.clientY <= r.bottom + pad;
      });
    };
    const show = (on) => {
      label.classList.toggle('visible', on);
      preview.classList.toggle('visible', on);
      hero.classList.toggle('cursor-hidden', on);   // real cursor only hidden while pill shows
    };
    let hovering = false;
    const move = (e) => {
      const x = e.clientX + 'px', y = e.clientY + 'px';
      label.style.setProperty('--cx', x);
      label.style.setProperty('--cy', y);
      preview.style.setProperty('--cx', x);
      preview.style.setProperty('--cy', y);
      show(hovering && !nearControl(e));
    };
    imgs.forEach((img) => {
      const comingSoon = img.hasAttribute('data-coming-soon');
      img.addEventListener('mousemove', move);
      img.addEventListener('mouseenter', (e) => {
        labelText.textContent = comingSoon ? 'Coming soon' : 'View case study';
        pImg.src = img.dataset.thumb || img.currentSrc || img.src;
        pTitle.textContent = img.dataset.title || img.alt || '';
        pDesc.textContent = img.dataset.desc || '';
        hovering = true;
        move(e);
      });
      img.addEventListener('mouseleave', () => {
        hovering = false;
        show(false);
      });
    });
  }
})();

/* NB: work-card click-through + the "View case study" cursor pill used to
   live here — they're shared with /work/ and the case studies now, so the
   single copy is /js/workcards.js. */

/* ── Splash screen ──────────────────────────────────────── */
const splash = document.getElementById('splash');

// sessionStorage access throws in privacy modes that block storage (Safari
// "block all cookies", etc.). Guarded so a throw can't kill this script before
// the dismiss handler is wired up — that would leave the splash overlay stuck
// covering the whole page with no way to enter.
let splashSeen = false;
try { splashSeen = !!sessionStorage.getItem('splashSeen'); } catch (e) {}

if (splashSeen) {
  // Skip splash when navigating back within the same tab session
  splash.style.display = 'none';
  document.dispatchEvent(new Event('splashDismissed'));
} else {
  // Lock scroll while splash is visible
  document.body.style.overflow = 'hidden';

  // Logo fades in on load. Targets the wrapper, not the img: the img's own
  // filter is reserved for the dark-mode recolour (see styles.css).
  gsap.fromTo('.splash-logo-wrap',
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
    const splashLogo = document.querySelector('.splash-logo-wrap');
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
        try { sessionStorage.setItem('splashSeen', '1'); } catch (e) {}
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

