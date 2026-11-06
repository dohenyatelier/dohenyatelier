// Gives each case study its own Pinterest board and pins every image on the
// page to it as a separate pin, in page order. Posted images are recorded in
// .github/pinterest-pinned.json (the workflow commits it after each run), so it
// is safe to re-run and it picks up images added later.
//
// Usage: node .github/scripts/pin-casestudies.mjs --new <slug...> --changed <slug...>
//   --new      create the board if missing, then pin (new pages, manual runs)
//   --changed  only pin new images if the board already exists (edited pages)
// Env:   PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN,
//        or instead PINTEREST_ACCESS_TOKEN (e.g. a sandbox token from the app page),
//        optional PINTEREST_API_BASE (https://api-sandbox.pinterest.com/v5 for sandbox),
//        optional DRY_RUN=1 (print what would be pinned, post nothing).

import { readFile, writeFile } from 'node:fs/promises';

const API = process.env.PINTEREST_API_BASE || 'https://api.pinterest.com/v5';
const SITE = 'https://dohenyatelier.com';
const DRY_RUN = process.env.DRY_RUN === '1';
const SITE_SUFFIX = / — Doheny Atelier$/;
const PINNABLE = /\.(jpe?g|png|webp|gif|avif)$/i; // videos (.mp4) and .svg are never pinned
const CONVERT_TO_JPG = /\.avif$/i; // Pinterest can't read AVIF, so these are sent as JPG
const WAIT_FOR_LIVE_MS = 15 * 60 * 1000; // GitHub Pages deploy usually takes 1–5 min
const LEDGER = '.github/pinterest-pinned.json'; // { "<slug>": ["<image url>", ...] }

const lists = { new: [], changed: [] };
let current = 'new';
for (const arg of process.argv.slice(2)) {
  if (arg === '--new' || arg === '--changed') current = arg.slice(2);
  else if (arg) lists[current].push(arg);
}
lists.changed = lists.changed.filter((slug) => !lists.new.includes(slug));

if (!lists.new.length && !lists.changed.length) {
  console.log('No case studies to pin.');
  process.exit(0);
}

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} (add it under repo Settings → Secrets and variables → Actions).`);
  return value;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return match ? decode(match[1]) : '';
}

function meta(html, key) {
  const tag = html.match(new RegExp(`<meta[^>]*(?:name|property)="${key}"[^>]*>`, 'i'));
  return tag ? attr(tag[0], 'content') : '';
}

function decode(text) {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

async function readCaseStudy(slug) {
  const html = await readFile(`work/casestudy/${slug}/index.html`, 'utf8');
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*>/i);

  // The case study itself runs from the header to the "More Work" section;
  // images after that are thumbnails of OTHER projects, so leave them out.
  const start = html.search(/<section class="cs-header"/);
  const end = html.search(/<section class="more-work"/);
  const content = html.slice(start < 0 ? 0 : start, end < 0 ? undefined : end)
    .replace(/<!--[\s\S]*?-->/g, '');

  const seen = new Set();
  const images = [];
  // Only <img> tags are read, so <video>/<source>/<iframe> media is never pinned.
  for (const [tag] of content.matchAll(/<img\b[^>]*>/gi)) {
    // Frames 2+ of a frame-by-frame slideshow are aria-hidden duplicates of
    // frame 1 (e.g. the Obagi mechanical), so only the first frame is pinned.
    if (attr(tag, 'aria-hidden') === 'true') continue;
    const src = attr(tag, 'src') || attr(tag, 'data-src');
    if (!src || !PINNABLE.test(src)) continue;
    const url = new URL(src, `${SITE}/work/casestudy/${slug}/`).href;
    if (seen.has(url)) continue;
    seen.add(url);
    images.push({ url, alt: attr(tag, 'alt') });
  }

  return {
    slug,
    title: (meta(html, 'og:title') || slug).replace(SITE_SUFFIX, ''),
    description: meta(html, 'description') || meta(html, 'og:description'),
    link: canonical ? attr(canonical[0], 'href') : `${SITE}/work/casestudy/${slug}/`,
    images,
  };
}

async function waitUntilLive(url, deadline) {
  while (true) {
    const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (res && res.ok) return;
    if (Date.now() > deadline) throw new Error(`${url} is still not live after 15 minutes.`);
    await sleep(20000);
  }
}

// Most images are fetched by Pinterest straight from the live site; AVIF files
// are converted to JPG here first (sharp is installed by the workflow).
async function mediaSource(url, asJpg = false) {
  if (!asJpg && !CONVERT_TO_JPG.test(url)) return { source_type: 'image_url', url };
  const { default: sharp } = await import('sharp');
  const original = Buffer.from(await (await fetch(url)).arrayBuffer());
  const jpg = await sharp(original).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
  return { source_type: 'image_base64', content_type: 'image/jpeg', data: jpg.toString('base64') };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAccessToken() {
  if (process.env.PINTEREST_ACCESS_TOKEN) return process.env.PINTEREST_ACCESS_TOKEN;
  const basic = Buffer.from(`${env('PINTEREST_APP_ID')}:${env('PINTEREST_APP_SECRET')}`).toString('base64');
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env('PINTEREST_REFRESH_TOKEN') }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Pinterest token refresh failed (${res.status}): ${JSON.stringify(data)}`);
  return data.access_token;
}

async function api(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Pinterest ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function listAll(token, path) {
  const items = [];
  let bookmark = '';
  do {
    const query = new URLSearchParams({ page_size: '100', ...(bookmark && { bookmark }) });
    const page = await api(token, `${path}?${query}`);
    items.push(...(page.items || []));
    bookmark = page.bookmark;
  } while (bookmark);
  return items;
}

// Board names are capped short on Pinterest; the case study title is the name.
const boardName = (page) => page.title.slice(0, 50);

const pages = await Promise.all([...lists.new, ...lists.changed].map(readCaseStudy));

if (DRY_RUN) {
  for (const page of pages) {
    const mode = lists.new.includes(page.slug) ? 'create board if needed' : 'only if board exists';
    console.log(`\n[dry run] ${page.slug} → board "${boardName(page)}" (${mode}), ${page.images.length} pins:`);
    for (const image of page.images) console.log(`  ${image.url}  alt="${image.alt}"`);
  }
  process.exit(0);
}

function createPin(token, board, page, image, asJpg = false) {
  return mediaSource(image.url, asJpg).then((media_source) => api(token, '/pins', {
    method: 'POST',
    body: JSON.stringify({
      board_id: board.id,
      title: page.title.slice(0, 100),
      description: page.description.slice(0, 800),
      link: page.link,
      alt_text: (image.alt || page.title).slice(0, 500),
      media_source,
    }),
  }));
}

const token = await getAccessToken();
const boards = await listAll(token, '/boards');
const failures = [];
const ledger = JSON.parse(await readFile(LEDGER, 'utf8').catch(() => '{}'));

// Saved after every pin so a run that dies partway still records what it posted.
async function recordPinned(slug, url) {
  (ledger[slug] ||= []).push(url);
  await writeFile(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
}

for (const page of pages) {
  let board = boards.find((b) => b.name === boardName(page));
  if (!board) {
    if (!lists.new.includes(page.slug)) {
      console.log(`${page.slug}: no board yet, skipping edit (run the workflow manually to add it).`);
      continue;
    }
    board = await api(token, '/boards', {
      method: 'POST',
      body: JSON.stringify({ name: boardName(page), description: page.description.slice(0, 500), privacy: 'PUBLIC' }),
    });
    boards.push(board);
    delete ledger[page.slug]; // a brand-new board has nothing on it, whatever was recorded before
    console.log(`${page.slug}: created board "${board.name}".`);
  }

  const pinned = new Set(ledger[page.slug] || []);
  const todo = page.images.filter((image) => !pinned.has(image.url));
  console.log(`${page.slug}: ${todo.length} new of ${page.images.length} images.`);

  const deadline = Date.now() + WAIT_FOR_LIVE_MS;
  // Newest pins show first on a board, so pin bottom-up to keep page order.
  for (const image of todo.reverse()) {
    try {
      await waitUntilLive(image.url, deadline);
      let pin;
      try {
        pin = await createPin(token, board, page, image);
      } catch (err) {
        // A GIF would lose its animation as a JPG, so it isn't retried that way.
        if (/\.gif$/i.test(image.url)) throw err;
        console.log(`  retrying as a clean JPG: ${image.url} (${err.message})`);
        await sleep(5000);
        pin = await createPin(token, board, page, image, true);
      }
      await recordPinned(page.slug, image.url);
      console.log(`  pinned ${image.url} → https://www.pinterest.com/pin/${pin.id}/`);
    } catch (err) {
      // One bad image shouldn't stop the rest of the case studies.
      failures.push({ url: image.url, error: err.message });
      console.log(`  FAILED ${image.url}: ${err.message}`);
    }
    await sleep(1500); // stay well under Pinterest's rate limits
  }
}

if (failures.length) {
  console.log(`\n${failures.length} image(s) could not be pinned:`);
  for (const failure of failures) console.log(`  ${failure.url}\n    ${failure.error}`);
  process.exitCode = 1;
}
