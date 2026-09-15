/* ──────────────────────────────────────────────────────────────────────────
   accessibility.js — site-wide accessibility menu, shared by every page.

   Injects a sticky round button (bottom-left, just left of the theme toggle,
   matching its size/styling) that opens a categorised GRID of large option
   tiles — designed for maximum accessibility:
     • big, clearly-grouped tap targets (Content / Colour & Contrast / Reading)
     • full keyboard support (Tab, Enter/Space, Escape) + focus trap
     • screen-reader semantics (dialog, aria-pressed / descriptive labels)
     • active state never signalled by colour alone (bold border + check badge)

   Every setting is applied by toggling classes / CSS variables on <html> and is
   persisted to localStorage so it carries across pages. Visuals live in
   styles.css.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var STORAGE_KEY = 'da-a11y';
  var root = document.documentElement;

  /* Level presets (index 0 == off / default; each has 3 selectable levels,
     shown as 3 clickable bars). */
  var FONT_STEPS   = [100, 110, 120, 130];                // zoom % (gentle steps)
  var LINE_STEPS   = [null, 1.6, 1.9, 2.2];               // line-height
  // Letter spacing opens up BOTH text styles via their tokens: body copy through
  // --ls-body (default -0.035em) and Engravers/caps text through --ls-caps
  // (default 0.2em). Driving the tokens (rather than a blanket <p> rule) means
  // the nav and "The Design Agency" widen correctly instead of breaking.
  var BODY_LS      = [null, '0.01em', '0.04em', '0.08em'];
  var CAPS_LS      = [null, '0.24em', '0.28em', '0.32em'];
  var BRIGHT_STEPS = [null, 1.15, 1.3, 0.8];              // brightness()

  var LEVELS = {
    fontStep:   FONT_STEPS.length,
    lineStep:   LINE_STEPS.length,
    letterStep: BODY_LS.length,
    brightStep: BRIGHT_STEPS.length
  };

  var defaults = {
    fontStep: 0, lineStep: 0, letterStep: 0, brightStep: 0,
    readableFont: false, dyslexicFont: false, bigCursor: false,
    hideImages: false, pauseAnim: false, tooltips: false,
    contrast: false, invert: false, grayscale: false,
    highlightLinks: false, highlightHeadings: false,
    readingGuide: false, readingMask: false
  };

  /* ── Icons (inline SVG, currentColor) ────────────────────── */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + inner + '</svg>';
  }
  var ICON = {
    text: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>'),
    line: svg('<path d="M3 5h18M3 12h18M3 19h18"/><path d="M3 5v14"/><path d="m6 8-3-3-3 3M6 16l-3 3-3-3" transform="translate(0 0)"/>'),
    letter: svg('<path d="M5 18 9 6l4 12M6.5 14h5"/><path d="M17 6v12M15 8l2-2 2 2M15 16l2 2 2-2"/>'),
    readable: svg('<path d="M4 7V5h16v2M9 5v14M7 19h4"/><path d="M14 19l4-10 4 10M15.3 15.5h5.4"/>'),
    dyslexic: svg('<path d="M4 20 8 6l4 14M5.5 15.5h5"/><path d="M14 20V7a4 4 0 0 1 4-4"/><path d="M13 11h7"/>'),
    cursor: svg('<path d="M5 3l6.5 16 2-6.5L20 10.5 5 3z"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 20"/>'),
    pause: svg('<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>'),
    tooltip: svg('<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/><path d="M12 8v.5M12 11v3"/>'),
    contrast: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" fill="currentColor"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
    invert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>'),
    grayscale: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7a5 5 0 0 0 0 10 5 5 0 0 0 0-10z" fill="currentColor"/>'),
    brightness: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
    link: svg('<path d="M9 12a4 4 0 0 1 4-4h3a4 4 0 0 1 0 8h-1"/><path d="M15 12a4 4 0 0 1-4 4H8a4 4 0 0 1 0-8h1"/>'),
    heading: svg('<path d="M6 4v16M18 4v16M6 12h12"/>'),
    guide: svg('<path d="M3 12h18"/><path d="M6 8h12M6 16h12" opacity=".5"/><path d="m3 12 2-2M3 12l2 2M21 12l-2-2M21 12l-2 2"/>'),
    mask: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18" /><rect x="3" y="9" width="18" height="6" fill="currentColor" opacity=".18"/>'),
    reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>')
  };

  /* ── Menu structure ──────────────────────────────────────── */
  var CATEGORIES = [
    { title: 'Content', tiles: [
      { type: 'level',  key: 'fontStep',   label: 'Bigger Text',     icon: ICON.text },
      { type: 'level',  key: 'lineStep',   label: 'Line Height',     icon: ICON.line },
      { type: 'level',  key: 'letterStep', label: 'Letter Spacing',  icon: ICON.letter },
      { type: 'toggle', key: 'readableFont', label: 'Readable Font', icon: ICON.readable },
      { type: 'toggle', key: 'dyslexicFont', label: 'Dyslexia Font', icon: ICON.dyslexic },
      { type: 'toggle', key: 'bigCursor',    label: 'Bigger Cursor', icon: ICON.cursor },
      { type: 'toggle', key: 'hideImages',   label: 'Hide Images',   icon: ICON.image },
      { type: 'toggle', key: 'pauseAnim',    label: 'Stop Animations', icon: ICON.pause },
      { type: 'toggle', key: 'tooltips',     label: 'Tooltips',      icon: ICON.tooltip }
    ]},
    { title: 'Colour & Contrast', tiles: [
      { type: 'toggle', key: 'contrast',   label: 'High Contrast',  icon: ICON.contrast },
      { type: 'toggle', key: 'invert',     label: 'Invert Colours', icon: ICON.invert },
      { type: 'toggle', key: 'grayscale',  label: 'Grayscale',      icon: ICON.grayscale },
      { type: 'level',  key: 'brightStep', label: 'Brightness',     icon: ICON.brightness },
      { type: 'toggle', key: 'highlightLinks',    label: 'Highlight Links', icon: ICON.link },
      { type: 'toggle', key: 'highlightHeadings', label: 'Highlight Titles', icon: ICON.heading }
    ]},
    { title: 'Reading Tools', tiles: [
      { type: 'toggle', key: 'readingGuide', label: 'Reading Guide', icon: ICON.guide },
      { type: 'toggle', key: 'readingMask',  label: 'Reading Mask',  icon: ICON.mask }
    ]}
  ];

  var state = load();

  function load() {
    var s = {};
    for (var k in defaults) if (defaults.hasOwnProperty(k)) s[k] = defaults[k];
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        for (var key in defaults)
          if (defaults.hasOwnProperty(key) && saved[key] !== undefined) s[key] = saved[key];
      }
    } catch (e) {}
    return s;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function isActive(tile) {
    return tile.type === 'level' ? state[tile.key] > 0 : !!state[tile.key];
  }

  /* ── Bigger Text ─────────────────────────────────────────────
     Scale ONLY font sizes, so text grows but section widths, padding, images
     and overall layout keep their footprint (unlike zoom, which scales
     everything). We multiply each font-size DECLARATION in the site's own
     stylesheet by the factor via calc(); keeping the original units (incl.
     clamp()/vw) means responsiveness still works with no JS on resize. The
     menu's own rules (and the html/root font-size, which rem depends on) are
     left alone. */
  var fontRules = null;
  function collectFontRules() {
    var out = [];
    function walk(rules) {
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (r.cssRules && (r.type === 4 || r.type === 12)) { // @media / @supports
          walk(r.cssRules);
        } else if (r.type === 1 && r.style) {               // style rule
          var sel = r.selectorText || '';
          if (/a11y|(^|,)\s*(html|:root)\b/i.test(sel)) continue; // skip menu + root
          var fs = r.style.getPropertyValue('font-size');
          if (fs && /px|em|rem|vw|vh|%|clamp|calc/i.test(fs)) {
            out.push({ style: r.style, original: fs,
                       priority: r.style.getPropertyPriority('font-size') });
          }
        }
      }
    }
    for (var s = 0; s < document.styleSheets.length; s++) {
      var rules;
      try { rules = document.styleSheets[s].cssRules; } catch (e) { continue; } // cross-origin
      if (rules) walk(rules);
    }
    return out;
  }
  function applyFontScale(factor) {
    if (!fontRules) { try { fontRules = collectFontRules(); } catch (e) { fontRules = []; } }
    for (var i = 0; i < fontRules.length; i++) {
      var rec = fontRules[i];
      var val = (factor === 1) ? rec.original : 'calc((' + rec.original + ') * ' + factor + ')';
      rec.style.setProperty('font-size', val, rec.priority);
    }
  }

  /* ── Apply state to the document ─────────────────────────── */
  function apply() {
    var cl = root.classList;
    cl.toggle('a11y-readable-font', !!state.readableFont);
    cl.toggle('a11y-dyslexic-font', !!state.dyslexicFont);
    cl.toggle('a11y-big-cursor', !!state.bigCursor);
    cl.toggle('a11y-hide-images', !!state.hideImages);
    cl.toggle('a11y-pause-anim', !!state.pauseAnim);
    cl.toggle('a11y-contrast', !!state.contrast);
    cl.toggle('a11y-highlight-links', !!state.highlightLinks);
    cl.toggle('a11y-highlight-headings', !!state.highlightHeadings);

    // Bigger Text: scale font sizes only — sections keep their size.
    applyFontScale((FONT_STEPS[state.fontStep] || 100) / 100);

    // Line Height: open up body copy only. Most body copy uses --lh-body; a few
    // body-style leads (e.g. .about-hero-heading) hardcode their line-height, so
    // they opt in via var(--a11y-lh, <own value>). Setting both reaches all of
    // them while headings/caps labels stay tight (sections aren't over-bloated).
    if (state.lineStep > 0) {
      root.style.setProperty('--lh-body', String(LINE_STEPS[state.lineStep]));
      root.style.setProperty('--a11y-lh', String(LINE_STEPS[state.lineStep]));
    } else {
      root.style.removeProperty('--lh-body');
      root.style.removeProperty('--a11y-lh');
    }

    if (state.letterStep > 0) {
      // Widen body copy (--ls-body) and Engravers/caps text (--ls-caps) together.
      root.style.setProperty('--ls-body', BODY_LS[state.letterStep]);
      root.style.setProperty('--ls-caps', CAPS_LS[state.letterStep]);
    } else {
      root.style.removeProperty('--ls-body');
      root.style.removeProperty('--ls-caps');
    }

    // Colour filters (invert / grayscale / brightness) on <html>, with a
    // counter-filter so the menu itself stays readable.
    var filters = [], counter = [];
    if (state.invert)    { filters.push('invert(1) hue-rotate(180deg)'); counter.unshift('invert(1) hue-rotate(180deg)'); }
    if (state.grayscale) { filters.push('grayscale(1)'); }
    if (state.brightStep > 0) {
      var b = BRIGHT_STEPS[state.brightStep];
      filters.push('brightness(' + b + ')');
      counter.unshift('brightness(' + (1 / b) + ')');
    }
    if (filters.length) root.style.filter = filters.join(' ');
    else root.style.removeProperty('filter');
    if (counter.length) root.style.setProperty('--a11y-counter-filter', counter.join(' '));
    else root.style.removeProperty('--a11y-counter-filter');

    ensureGuide(!!state.readingGuide);
    ensureMask(!!state.readingMask);
    ensureTooltips(!!state.tooltips);
  }

  /* ── Reading guide (bar follows the pointer) ─────────────── */
  var guideEl = null, guideMove = null;
  function ensureGuide(on) {
    if (on && !guideEl) {
      guideEl = document.createElement('div');
      guideEl.className = 'a11y-guide-bar';
      guideEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(guideEl);
      guideMove = function (e) {
        var y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        if (y != null) guideEl.style.top = y + 'px';
      };
      window.addEventListener('mousemove', guideMove, { passive: true });
      window.addEventListener('touchmove', guideMove, { passive: true });
    } else if (!on && guideEl) {
      window.removeEventListener('mousemove', guideMove);
      window.removeEventListener('touchmove', guideMove);
      guideEl.remove(); guideEl = null; guideMove = null;
    }
  }

  /* ── Reading mask (dims all but a band at the pointer) ───── */
  var maskTop = null, maskBottom = null, maskMove = null;
  var BAND = 90; // px
  function ensureMask(on) {
    if (on && !maskTop) {
      maskTop = document.createElement('div');
      maskBottom = document.createElement('div');
      maskTop.className = 'a11y-mask-top';
      maskBottom.className = 'a11y-mask-bottom';
      maskTop.setAttribute('aria-hidden', 'true');
      maskBottom.setAttribute('aria-hidden', 'true');
      document.body.appendChild(maskTop);
      document.body.appendChild(maskBottom);
      maskMove = function (e) {
        var y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        if (y == null) return;
        maskTop.style.height = Math.max(0, y - BAND / 2) + 'px';
        maskBottom.style.height = Math.max(0, window.innerHeight - y - BAND / 2) + 'px';
      };
      window.addEventListener('mousemove', maskMove, { passive: true });
      window.addEventListener('touchmove', maskMove, { passive: true });
      maskMove({ clientY: window.innerHeight / 2 });
    } else if (!on && maskTop) {
      window.removeEventListener('mousemove', maskMove);
      window.removeEventListener('touchmove', maskMove);
      maskTop.remove(); maskBottom.remove();
      maskTop = maskBottom = null; maskMove = null;
    }
  }

  /* ── Tooltips (surface accessible names on hover/focus) ──── */
  var tipEl = null, tipOver = null, tipOut = null;
  function accName(el) {
    if (!el || !el.getAttribute) return '';
    var name = el.getAttribute('aria-label') || el.getAttribute('title') ||
      (el.tagName === 'IMG' ? el.getAttribute('alt') : '') || '';
    if (!name) return '';
    // Skip names that just repeat the element's own visible text — e.g. the
    // aria-label GSAP SplitText adds to a heading it animates. A tooltip is only
    // useful when it surfaces something not already on screen (an icon button's
    // label, an image's alt, etc.).
    var norm = function (s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    var vis = norm(el.textContent);
    var nm = norm(name);
    if (vis && (vis === nm || vis.indexOf(nm) !== -1)) return '';
    return name;
  }
  function ensureTooltips(on) {
    if (on && !tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'a11y-tooltip';
      tipEl.setAttribute('role', 'tooltip');
      tipEl.hidden = true;
      document.body.appendChild(tipEl);
      tipOver = function (e) {
        var t = e.target;
        while (t && t !== document.body) {
          if (t.closest && t.closest('.a11y-panel, .a11y-toggle')) return;
          var name = accName(t);
          if (name) {
            tipEl.textContent = name;
            tipEl.hidden = false;
            var r = t.getBoundingClientRect();
            var top = r.top - tipEl.offsetHeight - 8;
            if (top < 4) top = r.bottom + 8;
            tipEl.style.top = Math.max(4, top) + 'px';
            tipEl.style.left = Math.min(
              Math.max(4, r.left),
              window.innerWidth - tipEl.offsetWidth - 4
            ) + 'px';
            return;
          }
          t = t.parentElement;
        }
      };
      tipOut = function () { if (tipEl) tipEl.hidden = true; };
      document.addEventListener('mouseover', tipOver, true);
      document.addEventListener('focusin', tipOver, true);
      document.addEventListener('mouseout', tipOut, true);
      document.addEventListener('focusout', tipOut, true);
    } else if (!on && tipEl) {
      document.removeEventListener('mouseover', tipOver, true);
      document.removeEventListener('focusin', tipOver, true);
      document.removeEventListener('mouseout', tipOut, true);
      document.removeEventListener('focusout', tipOut, true);
      tipEl.remove(); tipEl = null; tipOver = tipOut = null;
    }
  }

  /* ── Build the UI ────────────────────────────────────────── */
  var btn, panel, backdrop;

  var BTN_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3.5 8.2c2.61.7 5.67 1 8.5 1s5.89-.3 8.5-1' +
    'l.5 1.94c-1.86.5-4 .83-6 1V22h-2v-6h-2v6H9V11.14c-2-.17-4.14-.5-6-1L3.5 8.2z"/></svg>';

  function tileHTML(t) {
    var head =
      '<span class="a11y-tile-icon">' + t.icon + '</span>' +
      '<span class="a11y-tile-label">' + t.label + '</span>';

    if (t.type === 'level') {
      // A level tile is a group of clickable bars — click bar N to jump to
      // level N (click the active bar again to switch it off).
      var n = LEVELS[t.key] - 1, bars = '';
      for (var i = 1; i <= n; i++) {
        bars += '<button type="button" class="a11y-dot' + (state[t.key] >= i ? ' on' : '') +
          '" data-level="' + i + '" aria-pressed="' + (state[t.key] === i) +
          '" aria-label="' + t.label + ', level ' + i + ' of ' + n + '"></button>';
      }
      return '<div class="a11y-tile a11y-tile-level' + (isActive(t) ? ' is-active' : '') + '" ' +
        'data-key="' + t.key + '" data-type="level" role="group" aria-label="' + t.label + '">' +
        head + '<div class="a11y-dots">' + bars + '</div></div>';
    }

    return '<button type="button" class="a11y-tile' + (isActive(t) ? ' is-active' : '') + '" ' +
      'data-key="' + t.key + '" data-type="toggle" aria-pressed="' + !!state[t.key] + '">' +
      head + '</button>';
  }

  function build() {
    if (document.querySelector('.a11y-toggle')) return;

    btn = document.createElement('button');
    btn.className = 'a11y-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Accessibility options');
    btn.setAttribute('title', 'Accessibility options');
    btn.innerHTML = BTN_ICON;

    backdrop = document.createElement('div');
    backdrop.className = 'a11y-backdrop';
    backdrop.hidden = true;

    panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'a11y-title');
    panel.setAttribute('data-lenis-prevent', '');
    panel.hidden = true;

    var body = '';
    CATEGORIES.forEach(function (cat) {
      body += '<h3 class="a11y-cat-title">' + cat.title + '</h3><div class="a11y-grid">';
      cat.tiles.forEach(function (t) { body += tileHTML(t); });
      body += '</div>';
    });

    panel.innerHTML =
      '<div class="a11y-panel-head">' +
        '<h2 class="a11y-panel-title" id="a11y-title">Accessibility Options</h2>' +
        '<button type="button" class="a11y-close" aria-label="Close accessibility options">&times;</button>' +
      '</div>' +
      '<div class="a11y-panel-body">' + body + '</div>' +
      '<div class="a11y-panel-foot">' +
        '<button type="button" class="a11y-reset">' + ICON.reset + ' Reset Settings</button>' +
      '</div>';

    document.body.appendChild(btn);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    wire();
    apply();
  }

  /* ── Open / close ────────────────────────────────────────── */
  function isOpen() { return !panel.hidden; }

  function open() {
    panel.hidden = false;
    backdrop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown, true);
    // The page stays scrollable — scrolling over the menu scrolls the menu
    // (data-lenis-prevent + overscroll containment); scrolling anywhere else
    // scrolls the page as normal.
    var first = panel.querySelector('.a11y-close');
    if (first) first.focus();
  }
  function close(returnFocus) {
    panel.hidden = true;
    backdrop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);
    if (returnFocus !== false) btn.focus();
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { trapFocus(e); }
  }
  function trapFocus(e) {
    var f = panel.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ── Wire up controls ────────────────────────────────────── */
  function findTile(key) {
    for (var c = 0; c < CATEGORIES.length; c++) {
      var tiles = CATEGORIES[c].tiles;
      for (var i = 0; i < tiles.length; i++) if (tiles[i].key === key) return tiles[i];
    }
    return null;
  }

  function wire() {
    btn.addEventListener('click', function () { isOpen() ? close() : open(); });
    backdrop.addEventListener('click', function () { close(false); });
    panel.querySelector('.a11y-close').addEventListener('click', function () { close(); });

    // Toggle tiles (whole tile is a button).
    Array.prototype.forEach.call(panel.querySelectorAll('.a11y-tile[data-type="toggle"]'), function (el) {
      el.addEventListener('click', function () {
        var key = el.getAttribute('data-key');
        state[key] = !state[key];
        save(); apply(); refreshTile(el, findTile(key));
      });
    });

    // Level tiles: click a BAR to jump straight to that level (click the active
    // bar again to switch it off); click ANYWHERE ELSE in the cell to step up
    // one level, wrapping back to off after the highest.
    Array.prototype.forEach.call(panel.querySelectorAll('.a11y-tile-level'), function (tile) {
      tile.addEventListener('click', function (e) {
        var key = tile.getAttribute('data-key');
        var dot = e.target.closest('.a11y-dot');
        if (dot) {
          var lvl = parseInt(dot.getAttribute('data-level'), 10);
          state[key] = (state[key] === lvl) ? 0 : lvl;
        } else {
          state[key] = (state[key] + 1) % LEVELS[key];
        }
        save(); apply(); refreshTile(tile, findTile(key));
      });
    });

    panel.querySelector('.a11y-reset').addEventListener('click', function () {
      for (var k in defaults) if (defaults.hasOwnProperty(k)) state[k] = defaults[k];
      save(); apply(); refreshAll();
    });
  }

  function refreshTile(el, tile) {
    el.classList.toggle('is-active', isActive(tile));
    if (tile.type === 'toggle') {
      el.setAttribute('aria-pressed', String(!!state[tile.key]));
    } else {
      Array.prototype.forEach.call(el.querySelectorAll('.a11y-dot'), function (d, idx) {
        var lvl = idx + 1;
        d.classList.toggle('on', state[tile.key] >= lvl);
        d.setAttribute('aria-pressed', String(state[tile.key] === lvl));
      });
    }
  }
  function refreshAll() {
    Array.prototype.forEach.call(panel.querySelectorAll('.a11y-tile'), function (el) {
      refreshTile(el, findTile(el.getAttribute('data-key')));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
