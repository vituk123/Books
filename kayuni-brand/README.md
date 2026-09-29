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
| `animated/` | Intro as MP4, WebM, GIF, animated SVG and HTML, plus a looping loader SVG. |

Variants: default (Ink), `-white` (for dark backgrounds), `-lake` (accent colour).

**Colours:** Ink `#0E0E10` · Paper `#F6F5F1` · Lake `#0F5E78` · Dawn `#E09A2F` (data highlight only)

## Favicon snippet
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

## Regenerate
```bash
npm i playwright-core   # plus Python 3 with Pillow, and ffmpeg
node src/build.js       # every SVG, the animations, the social templates
node src/export.js      # PNG, PDF, ICO, MP4, WebM, GIF
```
To change the design, edit `src/geometry.js`. For example, `T` sets the letter weight and `KERN` sets the letter spacing. Then run both commands again.
