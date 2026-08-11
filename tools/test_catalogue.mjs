// 检查成就奖励文字与维基链接的拆分规则。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let failures = 0;
const check = (name, condition) => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
  if (!condition) failures++;
};

const sandbox = { console };
vm.createContext(sandbox);
for (const file of ['../data/achievements.js', '../data/achievements-reference-zh.js', '../data/achievements-zh.js']) {
  const code = readFileSync(new URL(file, import.meta.url), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}

const catalogue = sandbox.ISAAC_ZH;
check('成就图鉴共 641 项', Object.keys(catalogue).length === 641);

const unlockRows = Object.values(catalogue).filter((row) => row.rewardZh.startsWith('解锁'));
check('48 项解锁关卡/挑战奖励均保留普通文字前缀',
  unlockRows.length === 48 && unlockRows.every((row) =>
    row.rewardLinks.some((link) => link.url)
      ? row.rewardPrefix === '解锁' &&
        row.rewardLinks.length === 1 &&
        !row.rewardLinks[0].name.startsWith('解锁')
      : row.rewardPrefix === '' && row.rewardLinks.every((link) => !link.url)));

const segmentedIds = [29, 151, 152, 153, 154, 191, 236, 237, 245, 248, 250, 331, 332, 334, 593];
check('15 项说明型奖励均拆分普通文字与链接', segmentedIds.every((id) => {
  const row = catalogue[id];
  return row.rewardSegments.length > 1 &&
    row.rewardSegments.some((part) => part.url) &&
    row.rewardSegments.some((part) => !part.url) &&
    row.rewardSegments.map((part) => part.text).join('') === row.rewardZh;
}));

const expectedLinkCounts = {
  5: 4, 6: 2, 33: 1, 135: 2, 155: 2, 227: 2, 228: 2, 233: 2,
  346: 8, 347: 8, 415: 2, 542: 2,
};
check('所有多奖励成就均使用独立维基链接', Object.entries(expectedLinkCounts).every(([id, count]) =>
  catalogue[id].rewardLinks.filter((link) => link.url).length === count));

const correctedRewards = {
  191: '店主初始携带1枚硬币、店主初始额外拥有一个心之容器',
  243: '特殊隐藏房店主',
  247: '特殊商店店主',
  315: '死寂宝宝',
  346: '脆皮虫、粪山幼崽、滑坨坨、血痕畸胎、布朗尼、被遗弃者、小角恶魔、绷带人',
  347: '骨堆畸胎、超级绷带人、开膛姐妹、巨角恶魔、胖蛆族母、裂面爬墙蛛、糖梅宝宝、大乞丐宝',
  348: '黑洞',
  620: '该隐的魂石',
};
check('资料错字、概括和维基正式名称均已修正', Object.entries(correctedRewards).every(([id, reward]) =>
  catalogue[id].rewardZh === reward));

check('成就 #29 分别链接六面骰、以撒和六面骰',
  catalogue[29].rewardLinks.map((link) => link.name).join('|') === '六面骰|以撒|六面骰');
check('成就 #593 分别链接隐藏房、错误房和错误道具',
  catalogue[593].rewardLinks.map((link) => link.name).join('|') === '隐藏房|错误房|错误道具');

console.log(failures === 0 ? '\n成就图鉴检查全部通过 ✔' : `\n${failures} 项失败 ✘`);
process.exit(failures === 0 ? 0 : 1);
