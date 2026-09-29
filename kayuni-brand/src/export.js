// Rasterises the SVGs (PNG / PDF / ICO) and records the intro animation (MP4 / GIF / WebM).
// Needs: playwright-core + a Chromium, Python 3 with Pillow, and ffmpeg.
//   CHROME=/path/to/chrome FFMPEG=/path/to/ffmpeg node src/export.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const rel = (...p) => path.join(ROOT, ...p);
const mk = (p) => fs.mkdirSync(path.dirname(p), { recursive: true });
const dims = (file) => {
  const vb = fs.readFileSync(file, 'utf8').match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  return { w: vb[2], h: vb[3] };
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();

  async function png(svgFile, outFile, width, bg) {
    const { w, h } = dims(svgFile);
    const height = Math.round((width * h) / w);
    await page.setViewportSize({ width, height });
    const src = fs.readFileSync(svgFile, 'utf8').replace(/ width="[\d.]+" height="[\d.]+"/, ' width="100%" height="100%"');
    await page.setContent(`<body style="margin:0;background:${bg || 'transparent'}"><div style="width:${width}px;height:${height}px">${src}</div></body>`);
    mk(outFile);
    await page.screenshot({ path: outFile, omitBackground: !bg });
  }

  async function pdf(svgFile, outFile) {
    const { w, h } = dims(svgFile);
    const src = fs.readFileSync(svgFile, 'utf8');
    await page.setContent(`<style>@page{size:${w}px ${h}px;margin:0}body{margin:0}</style>${src}`);
    mk(outFile);
    await page.pdf({ path: outFile, width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: '1' });
  }

  // 1 ─ Logos: transparent PNGs at several widths + vector PDF for print
  const SIZES = { horizontal: [600, 1200, 2400, 4800], stacked: [400, 800, 1600, 3200],
                  wordmark: [600, 1200, 2400, 4800], mark: [256, 512, 1024, 2048] };
  for (const file of fs.readdirSync(rel('svg'))) {
    const name = file.replace('.svg', ''), svgPath = rel('svg', file);
    const kind = Object.keys(SIZES).find((k) => name.includes(k));
    if (kind) {
      for (const w of SIZES[kind]) await png(svgPath, rel('png', kind, `${name}-${w}w.png`), w);
      await pdf(svgPath, rel('pdf', `${name}.pdf`));
    } else if (name.includes('icon')) {
      for (const w of [64, 128, 256, 512, 1024]) await png(svgPath, rel('png', 'icon', `${name}-${w}.png`), w);
    }
  }
  console.log('✓ logo PNG + PDF');

  // 2 ─ Favicons & app icons
  const fav = (n) => rel('favicon', n);
  for (const s of [16, 32, 48]) await png(fav('favicon-tile.svg'), fav(`favicon-${s}.png`), s);
  await png(rel('svg/kayuni-icon-square.svg'), fav('apple-touch-icon.png'), 180);
  await png(rel('svg/kayuni-icon.svg'), fav('icon-192.png'), 192);
  await png(rel('svg/kayuni-icon.svg'), fav('icon-512.png'), 512);
  await png(fav('icon-maskable.svg'), fav('icon-maskable-512.png'), 512);
  execFileSync('python3', ['-c', `
from PIL import Image
imgs=[Image.open('${fav('favicon-%d.png')}'%s).convert('RGBA') for s in (16,32,48)]
imgs[2].save('${fav('favicon.ico')}',sizes=[(16,16),(32,32),(48,48)],append_images=imgs[:2])`]);
  console.log('✓ favicons');

  // 3 ─ Social images (opaque)
  for (const file of fs.readdirSync(rel('social')).filter((f) => f.endsWith('.svg'))) {
    const svgPath = rel('social', file);
    await png(svgPath, rel('social', file.replace('.svg', '.png')), dims(svgPath).w);
  }
  await png(rel('svg/kayuni-icon-square.svg'), rel('social', 'avatar-400.png'), 400);
  console.log('✓ social');

  // 4 ─ Motion: step the CSS animation frame-by-frame (deterministic, no dropped frames)
  async function record(html, outBase, { w = 1280, h = 720, fps = 30, secs = 4 } = {}) {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'kyn-'));
    await page.setViewportSize({ width: w, height: h });
    await page.goto('file://' + html);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    const n = Math.round(fps * secs);
    for (let i = 0; i < n; i++) {
      const t = (i / fps) * 1000;
      await page.evaluate((t) => document.getAnimations().forEach((a) => (a.currentTime = t)), t);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
    }
    const frames = ['-framerate', String(fps), '-i', path.join(tmp, 'f%04d.png')];
    const ff = (args) => execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...args]);
    mk(outBase);
    ff([...frames, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', outBase + '.mp4']);
    ff([...frames, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', outBase + '.webm']);
    ff([...frames, '-vf', `fps=25,scale=${Math.round(w * 0.625)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none`,
        '-loop', '-1', outBase + '.gif']); // plays once, holds on the final frame
    fs.rmSync(tmp, { recursive: true });
  }
  await record(rel('animated/kayuni-intro.html'), rel('animated', 'kayuni-intro'));
  await record(rel('animated/kayuni-intro-dark.html'), rel('animated', 'kayuni-intro-dark'));
  await record(rel('animated/kayuni-intro.html'), rel('animated', 'kayuni-intro-square'), { w: 1080, h: 1080 });
  console.log('✓ motion');

  await browser.close();
})();
