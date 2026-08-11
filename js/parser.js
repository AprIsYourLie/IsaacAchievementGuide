/**
 * 以撒的结合：忏悔 (Repentance / Repentance+) 存档解析器
 * 格式依据: Zamiell/isaac-save-viewer 的 IsaacSaveFile.ksy (Kaitai Struct 定义)
 * 以及 jamesthejellyfish/isaac-save-edit-script 的校验和逻辑。
 *
 * 文件布局:
 *   0x00..0x0F  魔数 "ISAACNGSAVE09R  " (16 字节, 含两个尾部空格)
 *   0x10..0x13  4 字节 (kaitai 标注为 crc, 实际游戏不依赖此字段)
 *   0x14..N-4   11 个顺序排列的 chunk (type: s4le, len: s4le [不可靠], body)
 *   最后 4 字节  自定义 CRC (种子 0xFEDCBA76), 计算范围 [0x10, len-4)
 */

const SAVE_MAGIC = 'ISAACNGSAVE09R  ';
const RUN_HEADERS = ['ISAACNG_GSR0018', 'ISAACNG_GSR0034', 'ISAACNG_GSR0065', 'ISAACNG_GSR0142'];
const OLD_HEADERS = {
  ISAACNGSAVE06R: '重生 (Rebirth)',
  ISAACNGSAVE08R: '胎衣 (Afterbirth)',
};
const NUM_ABPLUS_ACHIEVEMENTS = 404;
const MAX_SAVE_BYTES = 2 * 1024 * 1024;
const MAX_ARRAY_ITEMS = 1_000_000;

const CHUNK_NAMES = {
  1: 'achievements',
  2: 'counters',
  3: 'levelCounters',
  4: 'collectibles',
  5: 'minibosses',
  6: 'bosses',
  7: 'challengeCounters',
  8: 'cutsceneCounters',
  9: 'gameSettings',
  10: 'specialSeedCounters',
  11: 'bestiaryCounters',
};

// 非标准 CRC 表, 提取自参考实现 jamesthejellyfish/isaac-save-edit-script:
const CRC_TABLE = new Uint32Array([
  0x00000000, 0x09073096, 0x120e612c, 0x1b0951ba, 0xff6dc419, 0xf66af48f, 0xed63a535, 0xe46495a3,
  0xfedb8832, 0xf7dcb8a4, 0xecd5e91e, 0xe5d2d988, 0x01b64c2b, 0x08b17cbd, 0x13b82d07, 0x1abf1d91,
  0xfdb71064, 0xf4b020f2, 0xefb97148, 0xe6be41de, 0x02dad47d, 0x0bdde4eb, 0x10d4b551, 0x19d385c7,
  0x036c9856, 0x0a6ba8c0, 0x1162f97a, 0x1865c9ec, 0xfc015c4f, 0xf5066cd9, 0xee0f3d63, 0xe7080df5,
  0xfb6e20c8, 0xf269105e, 0xe96041e4, 0xe0677172, 0x0403e4d1, 0x0d04d447, 0x160d85fd, 0x1f0ab56b,
  0x05b5a8fa, 0x0cb2986c, 0x17bbc9d6, 0x1ebcf940, 0xfad86ce3, 0xf3df5c75, 0xe8d60dcf, 0xe1d13d59,
  0x06d930ac, 0x0fde003a, 0x14d75180, 0x1dd06116, 0xf9b4f4b5, 0xf0b3c423, 0xebba9599, 0xe2bda50f,
  0xf802b89e, 0xf1058808, 0xea0cd9b2, 0xe30be924, 0x076f7c87, 0x0e684c11, 0x15611dab, 0x1c662d3d,
  0xf6dc4190, 0xffdb7106, 0xe4d220bc, 0xedd5102a, 0x09b18589, 0x00b6b51f, 0x1bbfe4a5, 0x12b8d433,
  0x0807c9a2, 0x0100f934, 0x1a09a88e, 0x130e9818, 0xf76a0dbb, 0xfe6d3d2d, 0xe5646c97, 0xec635c01,
  0x0b6b51f4, 0x026c6162, 0x196530d8, 0x1062004e, 0xf40695ed, 0xfd01a57b, 0xe608f4c1, 0xef0fc457,
  0xf5b0d9c6, 0xfcb7e950, 0xe7beb8ea, 0xeeb9887c, 0x0add1ddf, 0x03da2d49, 0x18d37cf3, 0x11d44c65,
  0x0db26158, 0x04b551ce, 0x1fbc0074, 0x16bb30e2, 0xf2dfa541, 0xfbd895d7, 0xe0d1c46d, 0xe9d6f4fb,
  0xf369e96a, 0xfa6ed9fc, 0xe1678846, 0xe860b8d0, 0x0c042d73, 0x05031de5, 0x1e0a4c5f, 0x170d7cc9,
  0xf005713c, 0xf90241aa, 0xe20b1010, 0xeb0c2086, 0x0f68b525, 0x066f85b3, 0x1d66d409, 0x1461e49f,
  0x0edef90e, 0x07d9c998, 0x1cd09822, 0x15d7a8b4, 0xf1b33d17, 0xf8b40d81, 0xe3bd5c3b, 0xeaba6cad,
  0xedb88320, 0xe4bfb3b6, 0xffb6e20c, 0xf6b1d29a, 0x12d54739, 0x1bd277af, 0x00db2615, 0x09dc1683,
  0x13630b12, 0x1a643b84, 0x016d6a3e, 0x086a5aa8, 0xec0ecf0b, 0xe509ff9d, 0xfe00ae27, 0xf7079eb1,
  0x100f9344, 0x1908a3d2, 0x0201f268, 0x0b06c2fe, 0xef62575d, 0xe66567cb, 0xfd6c3671, 0xf46b06e7,
  0xeed41b76, 0xe7d32be0, 0xfcda7a5a, 0xf5dd4acc, 0x11b9df6f, 0x18beeff9, 0x03b7be43, 0x0ab08ed5,
  0x16d6a3e8, 0x1fd1937e, 0x04d8c2c4, 0x0ddff252, 0xe9bb67f1, 0xe0bc5767, 0xfbb506dd, 0xf2b2364b,
  0xe80d2bda, 0xe10a1b4c, 0xfa034af6, 0xf3047a60, 0x1760efc3, 0x1e67df55, 0x056e8eef, 0x0c69be79,
  0xeb61b38c, 0xe266831a, 0xf96fd2a0, 0xf068e236, 0x140c7795, 0x1d0b4703, 0x060216b9, 0x0f05262f,
  0x15ba3bbe, 0x1cbd0b28, 0x07b45a92, 0x0eb36a04, 0xead7ffa7, 0xe3d0cf31, 0xf8d99e8b, 0xf1deae1d,
  0x1b64c2b0, 0x1263f226, 0x096aa39c, 0x006d930a, 0xe40906a9, 0xed0e363f, 0xf6076785, 0xff005713,
  0xe5bf4a82, 0xecb87a14, 0xf7b12bae, 0xfeb61b38, 0x1ad28e9b, 0x13d5be0d, 0x08dcefb7, 0x01dbdf21,
  0xe6d3d2d4, 0xefd4e242, 0xf4ddb3f8, 0xfdda836e, 0x19be16cd, 0x10b9265b, 0x0bb077e1, 0x02b74777,
  0x18085ae6, 0x110f6a70, 0x0a063bca, 0x03010b5c, 0xe7659eff, 0xee62ae69, 0xf56bffd3, 0xfc6ccf45,
  0xe00ae278, 0xe90dd2ee, 0xf2048354, 0xfb03b3c2, 0x1f672661, 0x166016f7, 0x0d69474d, 0x046e77db,
  0x1ed16a4a, 0x17d65adc, 0x0cdf0b66, 0x05d83bf0, 0xe1bcae53, 0xe8bb9ec5, 0xf3b2cf7f, 0xfab5ffe9,
  0x1dbdf21c, 0x14bac28a, 0x0fb39330, 0x06b4a3a6, 0xe2d03605, 0xebd70693, 0xf0de5729, 0xf9d967bf,
  0xe3667a2e, 0xea614ab8, 0xf1681b02, 0xf86f2b94, 0x1c0bbe37, 0x150c8ea1, 0x0e05df1b, 0x0702ef8d,
]);

function isaacChecksum(bytes, ofs, length) {
  let crc = (~0xfedcba76) >>> 0;
  for (let i = ofs; i < ofs + length; i++) {
    crc = (CRC_TABLE[(crc & 0xff) ^ bytes[i]] ^ (crc >>> 8)) >>> 0;
  }
  return (~crc) >>> 0;
}

class Reader {
  constructor(buffer) {
    this.view = new DataView(buffer);
    this.ofs = 0;
  }
  seek(ofs) { this.ofs = ofs; }
  ensure(n) {
    if (!Number.isInteger(n) || n < 0 || n > this.remaining) {
      throw new Error('文件内容不完整或包含异常长度，存档可能已损坏。');
    }
  }
  s4() { this.ensure(4); const v = this.view.getInt32(this.ofs, true); this.ofs += 4; return v; }
  u4() { this.ensure(4); const v = this.view.getUint32(this.ofs, true); this.ofs += 4; return v; }
  u1() { this.ensure(1); const v = this.view.getUint8(this.ofs); this.ofs += 1; return v; }
  bytes(n) { this.ensure(n); const v = new Uint8Array(this.view.buffer, this.ofs, n); this.ofs += n; return v; }
  get remaining() { return this.view.byteLength - this.ofs; }
}

function readU1Array(r) {
  const count = r.s4();
  validateCount(count, 1, r);
  const arr = new Uint8Array(count);
  for (let i = 0; i < count; i++) arr[i] = r.u1();
  return arr;
}

function readS4Array(r) {
  const count = r.s4();
  validateCount(count, 4, r);
  const arr = new Int32Array(count);
  for (let i = 0; i < count; i++) arr[i] = r.s4();
  return arr;
}

function readBestiary(r) {
  const count = r.u4();
  if (count > 1000) throw new Error('图鉴分组数量异常，存档可能已损坏。');
  const counters = [];
  for (let i = 0; i < count; i++) {
    const type = r.s4();
    const byteCount = r.s4();
    if (byteCount < 0 || byteCount % 4 !== 0) {
      throw new Error('图鉴数据长度异常，存档可能已损坏。');
    }
    const n = Math.floor(byteCount / 4);
    validateCount(n, 8, r);
    const values = [];
    for (let j = 0; j < n; j++) values.push({ entity: r.s4(), value: r.s4() });
    counters.push({ type, values });
  }
  return counters;
}

function validateCount(count, itemBytes, r) {
  if (!Number.isInteger(count) || count < 0 || count > MAX_ARRAY_ITEMS || count > Math.floor(r.remaining / itemBytes)) {
    throw new Error('存档包含异常数组长度，文件可能已损坏。');
  }
}

/**
 * 解析存档文件, 返回结构化数据。
 * @param {ArrayBuffer} buffer
 * @returns {{
 *   achievements: Uint8Array, counters: Int32Array, levelCounters: Int32Array,
 *   collectibles: Uint8Array, minibosses: Uint8Array, bosses: Uint8Array,
 *   challengeCounters: Uint8Array, cutsceneCounters: Int32Array,
 *   gameSettings: Int32Array, specialSeedCounters: Uint8Array, bestiary: Array,
 *   crcValid: boolean|null, fileSize: number
 * }}
 */
function parseSaveFile(buffer) {
  if (!(buffer instanceof ArrayBuffer)) throw new Error('内部错误: 输入不是 ArrayBuffer');
  if (buffer.byteLength < 16) throw new Error('文件太小, 不是有效的以撒存档。');
  if (buffer.byteLength > MAX_SAVE_BYTES) throw new Error('文件超过 2 MB，不像是有效的以撒持久存档。');

  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder().decode(bytes.slice(0, 14));

  if (RUN_HEADERS.includes(header.trim())) {
    throw new Error('这是单局游戏的临时存档 (gamestate)。请选择 persistentgamedata 持久存档文件。');
  }
  if (OLD_HEADERS[header.trim()]) {
    throw new Error(`这是《以撒的结合:${OLD_HEADERS[header.trim()]}》的存档, 本站仅支持《忏悔 Repentance / Repentance+》。`);
  }
  if (bytesToString(bytes.slice(0, 16)) !== SAVE_MAGIC) {
    throw new Error('无法识别的文件头, 这不是有效的忏悔存档文件。');
  }

  // 校验和 (宽容: 不匹配时仅提示, 仍尝试解析)
  let crcValid = null;
  if (buffer.byteLength > 20) {
    const stored = new DataView(buffer).getUint32(buffer.byteLength - 4, true);
    const calc = isaacChecksum(bytes, 0x10, buffer.byteLength - 0x10 - 4);
    crcValid = stored === calc;
  }

  const r = new Reader(buffer);
  r.seek(0x14);

  const result = { crcValid, fileSize: buffer.byteLength };
  const seenTypes = new Set();
  for (let i = 0; i < 11; i++) {
    if (r.remaining < 8) throw new Error('文件内容不完整, 存档可能已损坏。');
    const type = r.s4();
    const len = r.s4(); // 已知不可靠, 仅记录
    const name = CHUNK_NAMES[type];
    if (!name) throw new Error(`未知的存档区块类型 (${type}), 存档版本可能不受支持。`);
    if (seenTypes.has(type)) throw new Error(`存档区块重复 (${type})，文件可能已损坏。`);
    seenTypes.add(type);
    switch (name) {
      case 'achievements':
      case 'collectibles':
      case 'minibosses':
      case 'bosses':
      case 'challengeCounters':
      case 'specialSeedCounters':
        result[name] = readU1Array(r);
        break;
      case 'counters':
      case 'levelCounters':
      case 'cutsceneCounters':
      case 'gameSettings':
        result[name] = readS4Array(r);
        break;
      case 'bestiaryCounters':
        result.bestiary = readBestiary(r);
        break;
    }
    result[`${name}Len`] = len;
  }

  if (!result.achievements) throw new Error('存档缺少成就数据。');

  // Afterbirth+ 与 Repentance 魔数相同, 用成就数量区分
  if (result.achievements && result.achievements.length === NUM_ABPLUS_ACHIEVEMENTS) {
    throw new Error('这是《以撒的结合:胎衣+ (Afterbirth+)》的存档, 本站仅支持《忏悔 Repentance / Repentance+》。');
  }

  return result;
}

function bytesToString(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

// 同时支持直接双击 index.html 的经典脚本模式，以及 Node.js 测试包装器。
globalThis.IsaacSaveParser = Object.freeze({ parseSaveFile });
