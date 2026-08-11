/**
 * 从用户提供的“以撒全成就完成清单1.2.html”中提取 1–637 号中文资料。
 * 原文件只作为数据核对来源，不会被修改，也不会被打包进项目。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(toolsDir);
const sourcePath = resolve(process.argv[2] || 'E:/download/以撒全成就完成清单1.2.html');
const outputPath = join(root, 'data', 'achievements-reference-zh.js');

const html = readFileSync(sourcePath, 'utf8');
const match = html.match(/<script\s+type="application\/json"\s+id="data-json">([\s\S]*?)<\/script>/i);
if (!match) throw new Error('没有找到 data-json 数据块。');

const rows = JSON.parse(match[1]);
if (!Array.isArray(rows) || rows.length !== 637) {
  throw new Error(`应有 637 条成就，实际为 ${Array.isArray(rows) ? rows.length : '非数组'}。`);
}

const expectedFields = ['id', 'title', 'en', 'cond', 'reward', 'type'];
const ids = new Set();
for (const row of rows) {
  for (const field of expectedFields) {
    if (!(field in row)) throw new Error(`#${row.id || '?'} 缺少字段 ${field}。`);
  }
  if (!Number.isInteger(row.id) || row.id < 1 || row.id > 637 || ids.has(row.id)) {
    throw new Error(`非法或重复的成就编号：${row.id}`);
  }
  ids.add(row.id);
}
for (let id = 1; id <= 637; id++) {
  if (!ids.has(id)) throw new Error(`缺少成就 #${id}。`);
}

const normalized = Object.fromEntries(rows
  .sort((a, b) => a.id - b.id)
  .map((row) => [row.id, {
    title: String(row.title || '').trim(),
    en: String(row.en || '').trim(),
    cond: String(row.cond || '').trim(),
    reward: String(row.reward || '').trim(),
    type: String(row.type || '').trim(),
    char: String(row.char || '').trim(),
    priority: String(row.priority || '').trim(),
    wlink: String(row.wlink || '').trim(),
    wname: String(row.wname || '').trim(),
  }]));

const banner = `/*\n * 1–637 号成就的中文名称、条件、奖励和分类。\n * 由 tools/import_reference_data.mjs 从用户提供的清单提取，并参考以撒中文维基核对。\n * 原始参考 HTML、图集、界面代码与用户设置均未复制到本项目。\n */\n`;
const code = `${banner}globalThis.ISAAC_REFERENCE_ZH = ${JSON.stringify(normalized, null, 0)};\n`;
writeFileSync(outputPath, code, 'utf8');

const typeCounts = rows.reduce((counts, row) => {
  counts[row.type] = (counts[row.type] || 0) + 1;
  return counts;
}, {});
console.log(`已生成：${outputPath}`);
console.log(`条目：${rows.length}；分类：${JSON.stringify(typeCounts)}`);
