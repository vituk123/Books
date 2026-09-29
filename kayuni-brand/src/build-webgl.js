// Bundles the Three.js / WebGL logo into single, self-contained HTML files (work offline, no server).
//   node src/build-webgl.js
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const dir = path.join(__dirname, '..', 'webgl');
const { outputFiles } = esbuild.buildSync({
  entryPoints: [path.join(dir, 'src/main.js')], bundle: true, minify: true, format: 'iife',
  target: 'es2020', write: false, legalComments: 'none',
});
// Guard against "</script>" inside the bundle ending the inline tag early
const js = outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const tpl = fs.readFileSync(path.join(dir, 'src/template.html'), 'utf8');
const page = (bg, fg, theme) => tpl.replace('__BG__', bg).replace('__FG__', fg)
  .replace('<script>__SCRIPT__', theme ? `<script>history.replaceState(null,'','?theme=${theme}'+location.search.replace('?','&'))</script>\n<script>` + '__SCRIPT__' : '<script>__SCRIPT__')
  .replace('__SCRIPT__', () => js);
fs.writeFileSync(path.join(dir, 'kayuni-3d.html'), page('#0E0E10', '#F6F5F1'));
fs.writeFileSync(path.join(dir, 'kayuni-3d-light.html'), page('#F6F5F1', '#0E0E10', 'light'));
console.log(`webgl/kayuni-3d.html  (${(js.length / 1024).toFixed(0)} KB, three.js inlined)`);
