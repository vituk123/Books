# Kayuni — identity kit

Every shape in this identity is written in code: no image generation and no fonts. The bird and all six letters of the wordmark are geometry in `src/geometry.js`.

Open `index.html` in a browser to see the brand sheet.

| Folder | Use it for |
|---|---|
| `svg/` | Web, Figma, Illustrator. Pure vector paths. |
| `png/` | Word, PowerPoint, Google Docs. Transparent, several widths. |
| `pdf/` | Print shops, signage, merchandise (vector). |
| `favicon/` | Website tab and home-screen icons (`.ico`, `.svg`, Apple/Android, manifest). |
| `social/` | Avatar, LinkedIn and X banners, link-preview (Open Graph) image. |
| `webgl/` | **Three.js / WebGL 3D logo**: live page, videos (16:9, square, 9:16), hero stills. |
| `animated/` | Intro as MP4, WebM, GIF, animated SVG and HTML, plus a looping loader SVG. |

Variants: default (Ink), `-white` (for dark backgrounds), `-lake` (accent colour).

**Colours:** Ink `#0E0E10` · Paper `#F6F5F1` · Lake `#0F5E78` · Dawn `#E09A2F` (data highlight only)

## The 3D / WebGL logo
`webgl/kayuni-3d.html` is a single self-contained file with Three.js bundled inside. Double-click it; it needs no server and no internet.
- About 12,000 GPU particles (custom GLSL shaders) are sampled inside the real glyph outlines. They swirl in from a data cloud and settle left to right.
- The logo then becomes solid geometry. The vector paths are merged and extruded with bevels (`SVGLoader`, `ExtrudeGeometry`), finished in clearcoat material and lit by a procedural studio environment with a Lake rim light and a Dawn light sweep.
- After that it keeps gliding. It follows the mouse and replays on click. Add `?theme=light` to the URL for the light version.
- To embed it on a website, use an `<iframe src="kayuni-3d.html">`, or reuse `webgl/src/main.js` in your own bundle.

## Favicon snippet
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

## Regenerate
```bash
npm install            # three, esbuild, polygon-clipping, playwright-core (+ Python 3 with Pillow, and ffmpeg)
npm run build          # every SVG, the animations, the social templates, and the bundled WebGL page
npm run export         # PNG, PDF, ICO, MP4, WebM, GIF, including the 3D videos
```
To change the design, edit `src/geometry.js`. For example, `T` sets the letter weight and `KERN` sets the letter spacing. Then run both commands again.
