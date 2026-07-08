/* ──────────────────────────────────────────────────────────────────────────
   theme.js — manual light/dark colour theme, shared by every page.

   The actual theme is applied before first paint by a tiny inline snippet in
   each page's <head> (it reads localStorage and sets data-theme on <html>),
   which avoids a flash of the wrong theme. This file only:
     1. injects the sticky toggle button, and
     2. flips + persists the theme when it's clicked.

   All colours live in styles.css and invert via the html[data-theme="dark"]
   token remap — nothing here sets colours directly.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var STORAGE_KEY = 'da-theme';
  var root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    if (btn) {
      var isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      // Label describes the action the button performs.
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  var btn = null;

  function build() {
    if (document.querySelector('.theme-toggle')) return; // guard against double-inject
    btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    // Moon (shown in light mode) + sun (shown in dark mode); CSS decides which.
    btn.innerHTML =
      '<svg class="theme-toggle-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '<svg class="theme-toggle-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41' +
      'M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
    btn.addEventListener('click', function () {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
    document.body.appendChild(btn);
    apply(current()); // sync aria/label to whatever the FOUC snippet set
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
