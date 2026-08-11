// Node.js 测试使用的 ESM 包装器；浏览器页面直接加载 parser.js。
import './parser.js';

export const { parseSaveFile } = globalThis.IsaacSaveParser;

