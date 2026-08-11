// Node 自动化测试: 用合成存档验证 js/parser.js 的解析正确性
import { readFileSync } from 'node:fs';
import { parseSaveFile } from '../js/parser.module.mjs';

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
}

const buf = readFileSync(new URL('./sample_save.dat', import.meta.url));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const save = parseSaveFile(ab);

check('CRC 校验通过', save.crcValid === true);
check('成就数组长度 = 638', save.achievements.length === 638);

const unlocked = [];
for (let i = 1; i < save.achievements.length; i++) {
  if (save.achievements[i]) unlocked.push(i);
}
check('解锁成就 ID 正确 [1,2,3,5,8,100,637]',
  JSON.stringify(unlocked) === JSON.stringify([1, 2, 3, 5, 8, 100, 637]));

check('Mom Kills = 77', save.counters[1] === 77);
check('Deaths = 42', save.counters[9] === 42);
check('Eden Tokens = 13', save.counters[20] === 13);
check('Win Streak = 5', save.counters[21] === 5);
check('Best Streak = 9', save.counters[22] === 9);
check('收集品 #105 已见过', save.collectibles[105] === 1);
check('挑战 #7 已完成', save.challengeCounters[7] === 1);
check('图鉴 encounters[0] = {entity:100,value:5}',
  save.bestiary[0].type === 1 && save.bestiary[0].values[0].entity === 100 && save.bestiary[0].values[0].value === 5);
check('图鉴 kills[0] = {entity:100,value:12}',
  save.bestiary[1].type === 2 && save.bestiary[1].values[0].value === 12);

// 负例: 篡改一个字节后 CRC 应该失败
const bad = new Uint8Array(ab.slice(0));
bad[bad.length - 10] ^= 0xff;
try {
  const s2 = parseSaveFile(bad.buffer);
  check('篡改后 CRC 校验失败', s2.crcValid === false);
} catch {
  check('篡改后 CRC 校验失败(抛异常也算)', true);
}

// 负例: 错误文件头
try {
  parseSaveFile(new TextEncoder().encode('ISAACNGSAVE06R  xxxx').buffer);
  check('旧版魔数应报错', false);
} catch (e) {
  check('旧版魔数应报错', /重生/.test(e.message));
}

// 负例: 恶意数组长度不能触发巨量内存分配
try {
  const huge = ab.slice(0);
  new DataView(huge).setInt32(0x1c, 0x7fffffff, true);
  parseSaveFile(huge);
  check('异常数组长度应报错', false);
} catch (e) {
  check('异常数组长度应报错', /异常数组长度/.test(e.message));
}

console.log(failures === 0 ? '\n全部通过 ✔' : `\n${failures} 项失败 ✘`);
process.exit(failures === 0 ? 0 : 1);
