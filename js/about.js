gsap.registerPlugin(ScrollTrigger, SplitText);

/* ── Body copy: line reveal ───────────────────────────────── */
const copySplit = new SplitText('.about-copy p', { type: 'lines', linesClass: 'line-wrap' });
new SplitText('.about-copy p', { type: 'lines' });

gsap.set('.about-copy p .line-wrap', { overflow: 'hidden' });
gsap.set(copySplit.lines, { willChange: 'transform' });

gsap.from(copySplit.lines, {
  scrollTrigger: {
    trigger: '.about-copy p',
    start: 'top 90%',
  },
  y: 60,
  duration: 1.2,
  stagger: 0.14,
  ease: 'power4.out',
  clearProps: 'willChange',
});

/* ── Founder: line reveal on text, no photo animation ────── */
const founderSplit = new SplitText('.founder-text p', { type: 'lines', linesClass: 'line-wrap' });
new SplitText('.founder-text p', { type: 'lines' });

gsap.set('.founder-text p .line-wrap', { overflow: 'hidden' });
gsap.set(founderSplit.lines, { willChange: 'transform' });

gsap.from(founderSplit.lines, {
  scrollTrigger: {
    trigger: '.founder-text',
    start: 'top 90%',
  },
  y: 60,
  duration: 1.2,
  stagger: 0.14,
  ease: 'power4.out',
  clearProps: 'willChange',
});

/* ── Expertise label + items: stagger in ─────────────────── */
gsap.from('.expertise-label', {
  scrollTrigger: {
    trigger: '.expertise-label',
    start: 'top 90%',
  },
  y: 16,
  opacity: 0,
  duration: 0.7,
  ease: 'power2.out',
});

gsap.from('.expertise-item', {
  scrollTrigger: {
    trigger: '.expertise-list',
    start: 'top 90%',
  },
  y: 24,
  opacity: 0,
  duration: 0.7,
  stagger: 0.12,
  ease: 'power2.out',
});

/* ── Client logos: stagger fade ──────────────────────────── */
gsap.from('.client-logo', {
  scrollTrigger: {
    trigger: '.clients-grid',
    start: 'top 90%',
  },
  y: 16,
  opacity: 0,
  duration: 0.6,
  stagger: 0.08,
  ease: 'power2.out',
});

/* ── FAQ items: stagger fade ──────────────────────────────── */
gsap.from('.faq-heading', {
  scrollTrigger: {
    trigger: '.faq-heading',
    start: 'top 90%',
  },
  y: 16,
  opacity: 0,
  duration: 0.7,
  ease: 'power2.out',
});

gsap.from('.faq-item', {
  scrollTrigger: {
    trigger: '.faq-list',
    start: 'top 90%',
  },
  y: 20,
  opacity: 0,
  duration: 0.6,
  stagger: 0.1,
  ease: 'power2.out',
});
