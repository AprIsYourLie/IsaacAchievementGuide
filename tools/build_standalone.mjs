/**
 * 生成可独立复制的单独文件版本。
 * CSS、JavaScript、成就数据、图集和 4 个联机成就图标都会嵌入 HTML。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(toolsDir);
const outputPath = join(root, 'IsaacAchievementGuide-standalone.html');

let html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');
html = html.replace(
  '  <link rel="stylesheet" href="css/style.css" />',
  `  <style>\n${css}\n  </style>`
);

const atlasPath = join(root, 'assets', 'achievement-atlas.webp');
const atlasData = `data:image/webp;base64,${readFileSync(atlasPath).toString('base64')}`;
const iconDir = join(root, 'assets', 'achievements');
const iconData = {};
for (const filename of readdirSync(iconDir)) {
  const extension = extname(filename).toLowerCase();
  if (extension !== '.svg') continue;
  const id = Number(filename.slice(0, -extension.length));
  if (!Number.isInteger(id)) continue;
  const mime = extension === '.svg' ? 'image/svg+xml' : 'image/png';
  iconData[id] = `data:${mime};base64,${readFileSync(join(iconDir, filename)).toString('base64')}`;
}

if (Object.keys(iconData).length !== 4) {
  throw new Error(`应有 4 个联机成就 SVG 图标，实际找到 ${Object.keys(iconData).length} 个。`);
}

const scripts = [
  'data/achievements.js',
  'data/repentance-plus.js',
  'data/achievements-reference-zh.js',
  'data/achievements-zh.js',
  'js/parser.js',
  'js/app.js',
];

for (const source of scripts) {
  let code = readFileSync(join(root, ...source.split('/')), 'utf8');
  code = code.replaceAll('</script', '<\\/script');
  let inline = `  <script>\n${code}\n  </script>`;
  if (source === 'js/app.js') {
    const icons = JSON.stringify(iconData).replaceAll('</script', '<\\/script');
    inline = `  <script>\n/* 单独文件版内嵌图集与联机成就图标 */\nglobalThis.ACHIEVEMENT_ATLAS_DATA = ${JSON.stringify(atlasData)};\nglobalThis.ACHIEVEMENT_ICON_DATA = ${icons};\n  </script>\n${inline}`;
  }
  html = html.replace(`  <script src="${source}"></script>`, inline);
}

html = html
  .replace('<title>以撒的结合 · 成就分析</title>', '<title>以撒的结合 · 成就分析（单独文件版）</title>')
  .replace('<body>', '<body>\n  <!-- 此文件为自动生成的单独文件版；请修改源码后重新运行 tools/build_standalone.mjs。 -->');

writeFileSync(outputPath, html, 'utf8');
console.log(`已生成：${outputPath}`);
console.log(`大小：${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
