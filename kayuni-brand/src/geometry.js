// Kayuni brand geometry — every shape in the identity is defined here, in code.
// Units are abstract; y grows downward (SVG convention).

const f = (n) => +n.toFixed(2);

// ── The mark: a swift in a single stroke of flight ─────────────────────────
// Head → rising wing (the "ascent") → long tail that settles like a trend line.
const MARK = {
  viewBox: [0, 0, 200, 120],
  d: `M8 58L16.2 55.6C18.6 50.4 25.6 48.4 31 51.4C33.6 52.9 35.6 54.6 38.2 55.2` +
     `C60 44 82 26 106 6C90 23 74 42 63.5 60C98 86 146 104 194 113` +
     `C146 109.5 98 101 60 86C45 80 33 72.5 25 66C21.5 63.2 18.5 61 16 60.4Z`,
  // A tight, optically-centred box around the silhouette (used for icons)
  bounds: { x: 8, y: 6, w: 186, h: 107 },
};

// ── The wordmark: KAYUNI, drawn letter by letter ───────────────────────────
const H = 72;     // cap height
const T = 9.2;    // stem weight
const TD = 8.6;   // diagonal weight (optically thinner)

const rect = (x, y, w, h) => `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;

// A diagonal stroke with flat, horizontal ends — centre line (x0,y0)→(x1,y1)
function diag(x0, y0, x1, y1, t = TD) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const hw = t / 2 / (Math.abs(dy) / len);
  const pts = [[x0 - hw, y0], [x0 + hw, y0], [x1 + hw, y1], [x1 - hw, y1]];
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
}
// Same stroke, but the lower end is cut vertically at x = X (so it tucks into a stem)
function diagCutX(x0, y0, x1, y1, X, t = TD) {
  const hw = hwOf(x0, y0, x1, y1, t), m = (y1 - y0) / (x1 - x0);
  const yAt = (off) => y0 + (X - off - x0) * m;
  return `M${f(x0 - hw)} ${f(y0)}L${f(x0 + hw)} ${f(y0)}L${f(X)} ${f(yAt(hw))}L${f(X)} ${f(yAt(-hw))}Z`;
}
const hwOf = (x0, y0, x1, y1, t = TD) =>
  t / 2 / (Math.abs(y1 - y0) / Math.hypot(x1 - x0, y1 - y0));

// Each glyph: { w: advance width, d: path at origin }
const glyphs = {
  K() {
    const w = 50;
    return { w, d:
      rect(0, 0, T, H) +
      diagCutX(w - 5, 0, T + 2, 47, T / 2) +          // upper arm, tucked into the stem
      diag(24, 29, w - 4.4, H) };           // leg
  },
  A() {
    const w = 58, hw = hwOf(w / 2, 0, 4, H);
    return { w, d:
      diag(w / 2, 0, hw, H) +
      diag(w / 2, 0, w - hw, H) +
      rect(13, 47, w - 26, 7.6) };
  },
  Y() {
    const w = 56, hw = hwOf(0, 0, w / 2, 38);
    return { w, d:
      diag(hw, 0, w / 2, 39) +
      diag(w - hw, 0, w / 2, 39) +
      rect(w / 2 - T / 2, 36, T, H - 36) };
  },
  U() {
    const w = 52, ro = w / 2, ri = ro - T, cy = H - ro;
    return { w, d:
      `M0 0H${T}V${f(cy)}A${f(ri)} ${f(ri)} 0 0 0 ${f(w - T)} ${f(cy)}V0H${w}V${f(cy)}` +
      `A${f(ro)} ${f(ro)} 0 0 1 0 ${f(cy)}Z` };
  },
  N() {
    const w = 54;
    return { w, d:
      rect(0, 0, T, H) + rect(w - T, 0, T, H) +
      diag(T / 2 + 2.2, 0, w - T / 2 - 2.2, H, TD + 0.6) };
  },
  I() { return { w: T, d: rect(0, 0, T, H) }; },
};

// Optical sidebearing tweaks (diagonal letters sit tighter)
const KERN = { KA: -5, AY: -9, YU: -4, UN: 0, NI: 0 };

function wordmark(text = 'KAYUNI', tracking = 17) {
  let x = 0, d = '';
  const chars = [...text];
  chars.forEach((c, i) => {
    const g = glyphs[c]();
    d += `<path transform="translate(${f(x)} 0)" d="${g.d}"/>`;
    x += g.w;
    if (i < chars.length - 1) x += tracking + (KERN[c + chars[i + 1]] || 0);
  });
  return { d, w: f(x), h: H };
}

module.exports = { MARK, wordmark, H };
