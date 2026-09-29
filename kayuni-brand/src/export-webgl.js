// Renders the Three.js / WebGL logo to video (MP4, WebM, GIF) and hero stills (PNG).
// Frames are stepped deterministically through window.KAYUNI.frame(t), so nothing is dropped.
//   FFMPEG=/path/to/ffmpeg node src/export-webgl.js [--stills-only]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const OUT = path.join(ROOT, 'webgl');
const stillsOnly = process.argv.includes('--stills-only');

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

  async function open(file, w, h, theme = '') {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => { throw e; });
    page.on('console', (m) => m.type() === 'error' && console.error('page:', m.text()));
    await page.goto(`file://${path.join(OUT, file)}?capture${theme}`);
    await page.waitForFunction(() => window.KAYUNI && window.KAYUNI.ready);
    return page;
  }
  const shot = async (page, t, file) => {
    await page.evaluate((t) => window.KAYUNI.frame(t), t);
    await page.screenshot({ path: file });
  };

  // Stills: the settled 3D logo, plus a mid-formation "data cloud" frame
  for (const [html, suffix] of [['kayuni-3d.html', ''], ['kayuni-3d-light.html', '-light']]) {
    const page = await open(html, 1920, 1080);
    await shot(page, 7.2, path.join(OUT, `kayuni-3d${suffix}.png`));
    await shot(page, 1.35, path.join(OUT, `kayuni-3d-forming${suffix}.png`));
    await shot(page, 2.45, path.join(OUT, `kayuni-3d-particles${suffix}.png`));
    await page.close();
  }
  console.log('✓ stills');
  if (stillsOnly) return browser.close();

  async function record(html, base, { w, h, fps = 30, secs = 8 }) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kyn3d-'));
    const page = await open(html, w, h);
    for (let i = 0; i < fps * secs; i++) {
      await shot(page, i / fps, path.join(tmp, `f${String(i).padStart(4, '0')}.png`));
    }
    await page.close();
    const frames = ['-framerate', String(fps), '-i', path.join(tmp, 'f%04d.png')];
    const ff = (args) => execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...args]);
    ff([...frames, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', base + '.mp4']);
    ff([...frames, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', base + '.webm']);
    ff([...frames, '-vf', `fps=20,scale=${Math.round(w / 2)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
        '-loop', '0', base + '.gif']);
    fs.rmSync(tmp, { recursive: true });
    console.log('✓', path.basename(base));
  }
  await record('kayuni-3d.html', path.join(OUT, 'kayuni-3d'), { w: 1920, h: 1080 });
  await record('kayuni-3d-light.html', path.join(OUT, 'kayuni-3d-light'), { w: 1920, h: 1080 });
  await record('kayuni-3d.html', path.join(OUT, 'kayuni-3d-square'), { w: 1080, h: 1080 });
  await record('kayuni-3d.html', path.join(OUT, 'kayuni-3d-vertical'), { w: 1080, h: 1920 }); // Reels / Stories / TikTok
  await browser.close();
})();
