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
    135: [
      { name: '额外选择', path: '/wiki/C249' },
      { name: '更多选择', path: '/wiki/C414' },
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
    globalThis.ISAAC_ZH[id] = {
      nameZh: row.title,
      nameEn: row.en || fallback.name || '',
      descZh: id === 641 ? '道具描述！' : description(row),
      unlockZh: row.cond,
      rewardZh: row.reward === '无奖励' ? '' : row.reward,
      rewardLinks: rewardLinkOverrides[id]
        ? rewardLinkOverrides[id].map((item) => ({ name: item.name, url: HUIJI + item.path }))
        : (row.reward && row.reward !== '无奖励' ? [{ name: row.reward, url: rewardUrl(row) }] : []),
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
