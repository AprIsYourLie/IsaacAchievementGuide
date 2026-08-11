// 交叉验证: 用 Zamiell/isaac-save-viewer 的官方 Kaitai 解析器解析合成存档,
// 与本项目的 parser.js 结果对比。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseSaveFile } from '../js/parser.module.mjs';

const sandbox = {};
vm.createContext(sandbox);
for (const f of ['KaitaiStream.js', 'IsaacSaveFile.js']) {
  const code = readFileSync(new URL(`./reference/${f}`, import.meta.url), 'utf8');
  vm.runInContext(`(function(root){ ${code} }).call(this, this)`, sandbox);
}
const IsaacSaveFile = sandbox.IsaacSaveFile;
if (!IsaacSaveFile) { console.log('FAIL 无法加载官方解析器'); process.exit(1); }

const buf = readFileSync(new URL('./sample_save.dat', import.meta.url));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

// 在沙箱 realm 内构造 ArrayBuffer, 避免跨 realm 类型检查问题
sandbox.__bytes = Array.from(buf);
const refAb = vm.runInContext('new Uint8Array(__bytes).buffer', sandbox);

const ref = new IsaacSaveFile(new sandbox.KaitaiStream(refAb));
const mine = parseSaveFile(ab);

let failures = 0;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n); if (!c) failures++; };

const refAch = ref.chunks[0].body.achievements;
check(`成就数组一致 (ref ${refAch.length} vs mine ${mine.achievements.length})`,
  refAch.length === mine.achievements.length && refAch.every((v, i) => v === mine.achievements[i]));

const refCounters = ref.chunks[1].body.counters;
check(`计数器一致 (ref[9]=${refCounters[9]} mine=${mine.counters[9]})`,
  refCounters.length === mine.counters.length && refCounters.every((v, i) => v === mine.counters[i]));

const refItems = ref.chunks[3].body.seenById;
check('收集品一致', refItems.length === mine.collectibles.length && refItems.every((v, i) => v === mine.collectibles[i]));

const refBestiary = ref.chunks[10].body.counters;
check(`图鉴一致 (ref ${refBestiary.length} 组, mine ${mine.bestiary.length} 组)`,
  refBestiary.length === mine.bestiary.length &&
  refBestiary[0].body.values[0].entity === mine.bestiary[0].values[0].entity &&
  refBestiary[0].body.values[0].value === mine.bestiary[0].values[0].value);

console.log(failures === 0 ? '\n交叉验证通过 ✔' : `\n${failures} 项不一致 ✘`);
process.exit(failures ? 1 : 0);
