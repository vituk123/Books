// Generates every Kayuni SVG, the animated files and the brand sheet from geometry.js.
// Run:  node src/build.js   (then  node src/export.js  for PNG / ICO / GIF / MP4)
const fs = require('fs');
const path = require('path');
const { MARK, wordmark, H } = require('./geometry');

const OUT = path.join(__dirname, '..');
const COLORS = {
  ink:   '#0E0E10', // primary — near-black with a hint of blue
  paper: '#F6F5F1', // warm off-white
  lake:  '#0F5E78', // Lake Malawi — the one accent colour
  dawn:  '#E09A2F', // data highlight / sparingly
  white: '#FFFFFF',
};

const f = (n) => +n.toFixed(2);
const write = (rel, s) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s.trim() + '\n');
};
const svg = (w, h, body, { title = 'Kayuni', vb = `0 0 ${f(w)} ${f(h)}` } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${f(w)}" height="${f(h)}" role="img" aria-label="${title}">
<title>${title}</title>
${body}
</svg>`;

const WM = wordmark();
const B = MARK.bounds;

// ── Pieces ─────────────────────────────────────────────────────────────────
const markG = (fill, x = 0, y = 0, s = 1) =>
  `<path fill="${fill}" transform="translate(${f(x - B.x * s)} ${f(y - B.y * s)}) scale(${f(s)})" d="${MARK.d}"/>`;
const wordG = (fill, x = 0, y = 0, s = 1) =>
  `<g fill="${fill}" transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">${WM.d}</g>`;

// Clear space = cap height of the wordmark (x). Every file ships with half of it.
function lockups(fill) {
  const pad = H / 2;
  // Horizontal: bird height = 1.5 × cap height, wordmark optically centred on the body
  const ms = (H * 1.85) / B.h, mw = B.w * ms, mh = B.h * ms, gap = H * 0.5;
  const hW = pad * 2 + mw + gap + WM.w, hH = pad * 2 + mh;
  const horizontal = svg(hW, hH,
    markG(fill, pad, pad, ms) + '\n' + wordG(fill, pad + mw + gap, pad + (mh - H) / 2 + H * 0.12));

  // Stacked: bird centred over the wordmark, ~62% of its width
  const ss = (WM.w * 0.62) / B.w, sw = B.w * ss, sh = B.h * ss, sgap = H * 0.7;
  const sW = pad * 2 + WM.w, sH = pad * 2 + sh + sgap + H;
  const stacked = svg(sW, sH,
    markG(fill, pad + (WM.w - sw) / 2, pad, ss) + '\n' + wordG(fill, pad, pad + sh + sgap));

  const mark = svg(B.w + pad * 2, B.h + pad * 2, markG(fill, pad, pad));
  const word = svg(WM.w + pad * 2, H + pad * 2, wordG(fill, pad, pad));
  return { horizontal, stacked, mark, word };
}

// Square icon: bird optically centred (its mass sits low-right, so nudge up-left)
function icon(bg, fg, radius = 0.22, k = 0.7) {
  const S = 512, s = (S * k) / B.w;
  const x = (S - B.w * s) / 2 - S * 0.01, y = (S - B.h * s) / 2 - S * 0.035;
  const r = radius ? `rx="${S * radius}"` : '';
  return svg(S, S, `<rect width="${S}" height="${S}" ${r} fill="${bg}"/>\n` + markG(fg, x, y, s));
}

// ── Static SVGs ────────────────────────────────────────────────────────────
const variants = {
  '':       COLORS.ink,
  '-white': COLORS.white,
  '-lake':  COLORS.lake,
};
for (const [suffix, fill] of Object.entries(variants)) {
  const L = lockups(fill);
  write(`svg/kayuni-horizontal${suffix}.svg`, L.horizontal);
  write(`svg/kayuni-stacked${suffix}.svg`, L.stacked);
  write(`svg/kayuni-mark${suffix}.svg`, L.mark);
  write(`svg/kayuni-wordmark${suffix}.svg`, L.word);
}
write('svg/kayuni-icon.svg',        icon(COLORS.ink,  COLORS.paper));
write('svg/kayuni-icon-lake.svg',   icon(COLORS.lake, COLORS.white));
write('svg/kayuni-icon-light.svg',  icon(COLORS.paper, COLORS.ink));
write('svg/kayuni-icon-square.svg', icon(COLORS.ink,  COLORS.paper, 0)); // platforms apply their own rounding
write('favicon/favicon-tile.svg',   icon(COLORS.ink,  COLORS.paper, 0.18, 0.9)); // tighter crop for 16–48px
write('favicon/icon-maskable.svg',  icon(COLORS.ink,  COLORS.paper, 0, 0.56)); // Android safe zone

// Favicon SVG adapts to the browser's light/dark tab bar
const fs_ = (512 * 0.86) / B.w;
write('favicon/favicon.svg', svg(512, 512, `<style>path{fill:${COLORS.ink}}@media (prefers-color-scheme:dark){path{fill:${COLORS.paper}}}</style>
<path transform="translate(${f((512 - B.w * fs_) / 2 - B.x * fs_)} ${f((512 - B.h * fs_) / 2 - B.y * fs_ - 10)}) scale(${f(fs_)})" d="${MARK.d}"/>`));

// ── Animated SVG: the intro (self-contained CSS, plays once, works in <img>) ──
function animatedLockup(fill = COLORS.ink, accent = COLORS.lake) {
  const pad = H / 2, ms = (H * 1.85) / B.h, mw = B.w * ms, mh = B.h * ms, gap = H * 0.5;
  const W = pad * 2 + mw + gap + WM.w, Hh = pad * 2 + mh;
  const wx = pad + mw + gap, wy = pad + (mh - H) / 2 + H * 0.12;
  let i = 0;
  const letters = WM.d.replace(/<path transform="([^"]+)" d="([^"]+)"\/>/g, (_, t, d) =>
    `<g transform="${t}"><path class="l" style="animation-delay:${f(1.25 + i++ * 0.07)}s" d="${d}"/></g>`);
  const mt = `translate(${f(pad - B.x * ms)} ${f(pad - B.y * ms)}) scale(${f(ms)})`;
  return svg(W, Hh, `<style>
  .trace{fill:none;stroke:${accent};stroke-width:1.3;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;
         animation:draw 1.1s cubic-bezier(.65,0,.35,1) forwards, fadeout .5s .95s forwards}
  .bird{fill:${fill};opacity:0;animation:fill .6s .75s ease-out forwards}
  .glide{animation:glide 1.8s cubic-bezier(.16,1,.3,1) both}
  .l{fill:${fill};opacity:0;transform-box:fill-box;animation:rise .7s cubic-bezier(.16,1,.3,1) forwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  @keyframes fadeout{to{opacity:0}}
  @keyframes fill{to{opacity:1}}
  @keyframes glide{from{transform:translate(-26px,18px)}to{transform:none}}
  @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){*{animation-duration:1ms!important;animation-delay:0s!important}}
</style>
<g class="glide"><g transform="${mt}">
  <path class="bird" d="${MARK.d}"/>
  <path class="trace" pathLength="1" d="${MARK.d}"/>
</g></g>
<g transform="translate(${f(wx)} ${f(wy)})">${letters}</g>`, { title: 'Kayuni' });
}
write('animated/kayuni-intro.svg', animatedLockup());
write('animated/kayuni-intro-white.svg', animatedLockup(COLORS.white, COLORS.dawn));

// Looping loader: the swift beats its wing (SMIL morph — same command structure)
const WING_UP   = 'C60 44 82 26 106 6C90 23 74 42 63.5 60';
const WING_DOWN = 'C62 52 88 50 116 56C94 58 76 60 63.5 60';
const markDown = MARK.d.replace(WING_UP, WING_DOWN);
const loader = (fill) => svg(B.w + 24, B.h + 24, `<g transform="translate(${12 - B.x} ${12 - B.y})">
<path fill="${fill}" d="${MARK.d}">
  <animate attributeName="d" dur="1.1s" repeatCount="indefinite" calcMode="spline"
    keyTimes="0;0.45;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="${MARK.d};${markDown};${MARK.d}"/>
  <animateTransform attributeName="transform" type="translate" dur="1.1s" repeatCount="indefinite"
    calcMode="spline" keyTimes="0;0.45;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="0 0;0 -3;0 0"/>
</path></g>`, { title: 'Loading' });
write('animated/kayuni-loader.svg', loader(COLORS.ink));
write('animated/kayuni-loader-white.svg', loader(COLORS.white));

// ── Full-screen intro page (also the source for GIF / MP4 export) ───────────
const intro = (bg, fill, accent) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kayuni Intro</title>
<style>
  html,body{margin:0;height:100%;background:${bg};display:grid;place-items:center;overflow:hidden}
  .stage{width:min(72vw,900px);position:relative}
  .stage svg{width:100%;height:auto;display:block}
  .tag{font:500 clamp(10px,1.1vw,14px)/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.42em;
       text-transform:uppercase;color:${fill};opacity:0;text-align:right;margin-top:1.4em;padding-right:.3em;
       animation:t .9s 2.1s ease-out forwards}
  .rule{height:1px;background:${accent};transform:scaleX(0);transform-origin:left;margin-top:1.2em;
        animation:r 1.1s 1.7s cubic-bezier(.65,0,.35,1) forwards}
  @keyframes t{to{opacity:.72}} @keyframes r{to{transform:none}}
  @media (prefers-reduced-motion:reduce){*{animation-duration:1ms!important;animation-delay:0s!important}}
</style></head>
<body><div class="stage">${animatedLockup(fill, accent).replace(/ width="[\d.]+" height="[\d.]+"/, '')}
<div class="rule"></div><div class="tag">Research · Data · Insight</div></div>
<script>/* click to replay */document.body.onclick=()=>document.getAnimations().forEach(a=>{a.cancel();a.play()})</script>
</body></html>`;
write('animated/kayuni-intro.html', intro(COLORS.paper, COLORS.ink, COLORS.lake));
write('animated/kayuni-intro-dark.html', intro(COLORS.ink, COLORS.paper, COLORS.dawn));

// ── Social templates (rendered to PNG by export.js) ────────────────────────
const L = lockups(COLORS.ink), Lw = lockups(COLORS.paper);
const inner = (s) => s.replace(/^[\s\S]*?<\/title>\n/, '').replace(/<\/svg>$/, '');
const vbOf = (s) => s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
function banner(W, Hh, lock, bg, scale, accent, tagline) {
  const [, , lw, lh] = vbOf(lock);
  const s = (Hh * scale) / lh, x = (W - lw * s) / 2, y = (Hh - lh * s) / 2 - (tagline ? Hh * 0.04 : 0);
  const tag = tagline ? `<text x="${W / 2}" y="${f(y + lh * s + Hh * 0.06)}" text-anchor="middle" fill="${accent}"
    font-family="Helvetica, Arial, sans-serif" font-size="${f(Hh * 0.028)}" letter-spacing="${f(Hh * 0.012)}">${tagline}</text>` : '';
  return svg(W, Hh, `<rect width="${W}" height="${Hh}" fill="${bg}"/>
<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">${inner(lock)}</g>${tag}`);
}
write('social/og-image.svg',        banner(1200, 630, L.stacked, COLORS.paper, 0.52, COLORS.lake, 'RESEARCH · DATA · INSIGHT'));
write('social/og-image-dark.svg',   banner(1200, 630, Lw.stacked, COLORS.ink, 0.52, COLORS.dawn, 'RESEARCH · DATA · INSIGHT'));
write('social/linkedin-banner.svg', banner(1584, 396, Lw.horizontal, COLORS.ink, 0.42, COLORS.dawn));
write('social/x-header.svg',        banner(1500, 500, Lw.horizontal, COLORS.ink, 0.36, COLORS.dawn));

// Web manifest for the favicon set
write('favicon/site.webmanifest', JSON.stringify({
  name: 'Kayuni', short_name: 'Kayuni', theme_color: COLORS.ink, background_color: COLORS.paper, display: 'standalone',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
}, null, 2));

module.exports = { COLORS };
console.log('SVGs written to', OUT);
