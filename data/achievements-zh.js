// 将参考清单数据整理成页面使用的统一中文显示层。
(function () {
  const HUIJI = 'https://isaac.huijiwiki.com';
  const ACHIEVEMENT = `${HUIJI}/wiki/%E6%88%90%E5%B0%B1/`;

  const extra = {
    638: { title: '游玩联机模式', en: 'Play Online', cond: '游玩一次联机模式。', reward: '无奖励', type: '其余成就', char: '', priority: '', wlink: '', wname: '' },
    639: { title: '通关联机模式', en: 'Win Online', cond: '通关一次联机模式。', reward: '无奖励', type: '其余成就', char: '', priority: '', wlink: '', wname: '' },
    640: { title: '通关联机每日挑战', en: 'Win an Online Daily', cond: '通关一次联机每日挑战。', reward: '无奖励', type: '其余成就', char: '', priority: '', wlink: '', wname: '' },
    641: { title: '读它！', en: 'Read It!', cond: '击败妈妈。', reward: '道具描述！', type: '其余成就', char: '', priority: '', wlink: '', wname: '' },
  };

  const rewardLinkOverrides = {
    5: [
      { name: '饥荒骑士', path: '/wiki/%E5%AE%9E%E4%BD%93/63#63.0.0' },
      { name: '瘟疫骑士', path: '/wiki/%E5%AE%9E%E4%BD%93/64#64.0.0' },
      { name: '战争骑士', path: '/wiki/%E5%AE%9E%E4%BD%93/65#65.0.0' },
      { name: '死亡骑士', path: '/wiki/%E5%AE%9E%E4%BD%93/66#66.0.0' },
    ],
    6: [
      { name: '肉块', path: '/wiki/C73' },
      { name: '绷带球', path: '/wiki/C207' },
    ],
    33: [
      { name: '普通模式与困难模式难度增加', path: '' },
      { name: '半魂心', path: '/wiki/%E5%8D%8A%E9%AD%82%E5%BF%83' },
    ],
    135: [
      { name: '额外选择', path: '/wiki/C249' },
      { name: '更多选择', path: '/wiki/C414' },
    ],
    155: [
      { name: '乌列', path: '/wiki/%E5%AE%9E%E4%BD%93/271#271.0.0' },
      { name: '加百列', path: '/wiki/%E5%AE%9E%E4%BD%93/272#272.0.0' },
    ],
    227: [
      { name: '止痛药！', path: '/wiki/P28' },
      { name: '上瘾！', path: '/wiki/P29' },
    ],
    228: [
      { name: '放-松', path: '/wiki/P30' },
      { name: '???', path: '/wiki/P31' },
    ],
    233: [
      { name: '空白符文', path: '/wiki/K40' },
      { name: '透明符文', path: '/wiki/C263' },
    ],
    346: [
      { name: '脆皮虫', path: '/wiki/%E5%AE%9E%E4%BD%93/62#62.2.0' },
      { name: '粪山幼崽', path: '/wiki/%E5%AE%9E%E4%BD%93/237#237.2.0' },
      { name: '滑坨坨', path: '/wiki/%E5%AE%9E%E4%BD%93/261#261.1.0' },
      { name: '血痕畸胎', path: '/wiki/%E5%AE%9E%E4%BD%93/401#401.0.0' },
      { name: '布朗尼', path: '/wiki/%E5%AE%9E%E4%BD%93/402#402.0.0' },
      { name: '被遗弃者', path: '/wiki/%E5%AE%9E%E4%BD%93/403#403.0.0' },
      { name: '小角恶魔', path: '/wiki/%E5%AE%9E%E4%BD%93/404#404.0.0' },
      { name: '绷带人', path: '/wiki/%E5%AE%9E%E4%BD%93/405#405.0.0' },
    ],
    347: [
      { name: '骨堆畸胎', path: '/wiki/%E5%AE%9E%E4%BD%93/269#269.1.0' },
      { name: '超级绷带人', path: '/wiki/%E5%AE%9E%E4%BD%93/409#409.0.0' },
      { name: '开膛姐妹', path: '/wiki/%E5%AE%9E%E4%BD%93/410#410.0.0' },
      { name: '巨角恶魔', path: '/wiki/%E5%AE%9E%E4%BD%93/411#411.0.0' },
      { name: '胖蛆族母', path: '/wiki/%E5%AE%9E%E4%BD%93/413#413.0.0' },
      { name: '裂面爬墙蛛', path: '/wiki/%E5%AE%9E%E4%BD%93/900#900.0.0' },
      { name: '糖梅宝宝', path: '/wiki/%E5%AE%9E%E4%BD%93/908#908.0.0' },
      { name: '大乞丐宝', path: '/wiki/%E5%AE%9E%E4%BD%93/916#916.0.0' },
    ],
    415: [
      { name: '红钥匙', path: '/wiki/C580' },
      { name: '红钥匙碎片', path: '/wiki/K78' },
    ],
    542: [
      { name: 'XVIII-月亮？', path: '/wiki/K74' },
      { name: 'XIX-太阳？', path: '/wiki/K75' },
    ],
  };

  const rewardTextOverrides = {
    191: '店主初始携带1枚硬币、店主初始额外拥有一个心之容器',
    227: '止痛药！、上瘾！',
    228: '放-松、???',
    233: '空白符文、透明符文',
    243: '特殊隐藏房店主',
    247: '特殊商店店主',
    315: '死寂宝宝',
    346: '脆皮虫、粪山幼崽、滑坨坨、血痕畸胎、布朗尼、被遗弃者、小角恶魔、绷带人',
    347: '骨堆畸胎、超级绷带人、开膛姐妹、巨角恶魔、胖蛆族母、裂面爬墙蛛、糖梅宝宝、大乞丐宝',
    348: '黑洞',
    542: 'XVIII-月亮？、XIX-太阳？',
    620: '该隐的魂石',
  };

  const rewardSegmentOverrides = {
    29: [
      { text: '六面骰', path: '/wiki/C105' },
      { text: ' + ' },
      { text: '以撒', path: '/wiki/%E4%BB%A5%E6%92%92' },
      { text: '初始携带"' },
      { text: '六面骰', path: '/wiki/C105' },
      { text: '"' },
    ],
    151: [{ text: '商店', path: '/wiki/%E5%95%86%E5%BA%97' }, { text: '将会出售3个物品' }],
    152: [{ text: '商店', path: '/wiki/%E5%95%86%E5%BA%97' }, { text: '将会出售4个物品' }],
    153: [{ text: '商店', path: '/wiki/%E5%95%86%E5%BA%97' }, { text: '将会出售5个物品' }],
    154: [{ text: '商店', path: '/wiki/%E5%95%86%E5%BA%97' }, { text: '将会出售6个物品' }],
    191: [
      { text: '店主', path: '/wiki/%E5%BA%97%E4%B8%BB' },
      { text: '初始携带1枚硬币、' },
      { text: '店主', path: '/wiki/%E5%BA%97%E4%B8%BB' },
      { text: '初始额外拥有一个心之容器' },
    ],
    236: [{ text: '店主', path: '/wiki/%E5%BA%97%E4%B8%BB' }, { text: '初始携带"' }, { text: '木制镍币', path: '/wiki/C349' }, { text: '"' }],
    237: [{ text: '店主', path: '/wiki/%E5%BA%97%E4%B8%BB' }, { text: '初始携带"' }, { text: '商店钥匙', path: '/wiki/T83' }, { text: '"' }],
    245: [{ text: '该隐', path: '/wiki/%E8%AF%A5%E9%9A%90' }, { text: '初始携带"' }, { text: '回形针', path: '/wiki/T19' }, { text: '"' }],
    248: [{ text: '夏娃', path: '/wiki/%E5%A4%8F%E5%A8%83' }, { text: '初始携带"' }, { text: '剃刀片', path: '/wiki/C126' }, { text: '"' }],
    250: [{ text: '游魂', path: '/wiki/%E6%B8%B8%E9%AD%82' }, { text: '初始携带"' }, { text: '神圣屏障', path: '/wiki/C313' }, { text: '"' }],
    331: [{ text: '拉撒路', path: '/wiki/%E6%8B%89%E6%92%92%E8%B7%AF' }, { text: '初始携带道具"' }, { text: '贫血', path: '/wiki/C214' }, { text: '"' }],
    332: [{ text: '抹大拉', path: '/wiki/%E6%8A%B9%E5%A4%A7%E6%8B%89' }, { text: '初始携带胶囊"' }, { text: '体力回满', path: '/wiki/P5' }, { text: '"' }],
    334: [{ text: '参孙', path: '/wiki/%E5%8F%82%E5%AD%99' }, { text: '初始携带道具"' }, { text: '小孩的心脏', path: '/wiki/T34' }, { text: '"' }],
    593: [
      { text: '隐藏房', path: '/wiki/%E9%9A%90%E8%97%8F%E6%88%BF' },
      { text: '和' },
      { text: '错误房', path: '/wiki/%E9%94%99%E8%AF%AF%E6%88%BF' },
      { text: '生成的道具有概率变为' },
      { text: '错误道具', path: '/wiki/%E9%81%93%E5%85%B7/%E9%94%99%E8%AF%AF%E9%81%93%E5%85%B7' },
    ],
  };

  function description(row) {
    if (row.type === '角色解锁') return `你解锁了“${row.title}”。`;
    if (row.type === '解锁挑战') return `已解锁新的挑战：${row.title}。`;
    if (row.type === '完成挑战') return `已完成挑战：${row.title}。`;
    if (row.type === '解锁关卡') return `已解锁新的关卡：${row.title}。`;
    if (row.type === '通过关卡') return `已完成关卡成就：${row.title}。`;
    if (row.type === 'boss击败') return `已完成 Boss 成就：${row.title}。`;
    if (row.reward && row.reward !== '无奖励') return `已解锁奖励：${row.reward}。`;
    return `已完成成就：${row.title}。`;
  }

  function rewardUrl(row) {
    if (!row.wlink) return '';
    if (/^https?:\/\//i.test(row.wlink)) return row.wlink;
    return HUIJI + (row.wlink.startsWith('/') ? row.wlink : `/${row.wlink}`);
  }

  const source = { ...(globalThis.ISAAC_REFERENCE_ZH || {}), ...extra };
  globalThis.ISAAC_ZH = {};

  for (let id = 1; id <= 641; id++) {
    const row = source[id];
    const fallback = globalThis.ACHIEVEMENTS?.[id] || {};
    if (!row) throw new Error(`缺少中文成就资料：#${id}`);
    const rewardText = rewardTextOverrides[id] || row.reward;
    const splitUnlockReward = (row.type === '解锁关卡' || row.type === '解锁挑战')
      && rewardText?.startsWith('解锁') && Boolean(row.wlink);
    const rewardSegments = rewardSegmentOverrides[id]
      ? rewardSegmentOverrides[id].map((item) => ({ text: item.text, url: item.path ? HUIJI + item.path : '' }))
      : [];
    globalThis.ISAAC_ZH[id] = {
      nameZh: row.title,
      nameEn: row.en || fallback.name || '',
      descZh: id === 641 ? '道具描述！' : description({ ...row, reward: rewardText }),
      unlockZh: row.cond,
      rewardZh: rewardText === '无奖励' ? '' : rewardText,
      rewardLinks: rewardLinkOverrides[id]
        ? rewardLinkOverrides[id].map((item) => ({ name: item.name, url: item.path ? HUIJI + item.path : '' }))
        : (rewardSegments.length
          ? rewardSegments.filter((item) => item.url).map((item) => ({ name: item.text, url: item.url }))
          : (rewardText && rewardText !== '无奖励'
            ? [{ name: splitUnlockReward ? rewardText.slice(2) : rewardText, url: rewardUrl(row) }]
            : [])),
      rewardSegments,
      rewardPrefix: splitUnlockReward ? '解锁' : '',
      type: row.type,
      character: row.char || '',
      priority: row.priority || '',
      achievementWiki: ACHIEVEMENT + id,
      rewardWiki: rewardUrl(row),
      rewardWikiName: row.wname || row.reward || '',
      verified: true,
    };
  }
})();
