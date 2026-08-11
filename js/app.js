if (!globalThis.IsaacSaveParser?.parseSaveFile) {
  throw new Error('存档解析器加载失败，请刷新页面后重试。');
}

const HUIJI_WIKI_PREFIX = 'https://isaac.huijiwiki.com/wiki/';
const MAX_SAVE_FILE_BYTES = 2 * 1024 * 1024;
const PAGE_SIZE = 32;
const LOCAL_STATE_KEY = 'isaac-achievement-guide-state-v2';
const ATLAS_COLUMNS = 20;
const ATLAS_ICON_SIZE = 92;
const CHARACTER_ORDER = [
  '以撒', '抹大拉', '该隐', '犹大', '???', '夏娃', '参孙', '阿撒泻勒', '拉撒路',
  '伊甸', '游魂', '莉莉丝', '店主', '亚玻伦', '遗骸', '伯大尼', '雅各和以扫', '全角色',
];
const CAT_NAMES = {
  normal: '普通角色',
  tainted: '堕化角色',
  challenge: '挑战成就',
  level: '关卡成就',
  'character-unlock': '角色解锁',
  boss: 'Boss 成就',
  other: '其他成就',
};
const KNOWN_STATS = [
  { index: 1, label: '妈妈击杀数' },
  { index: 9, label: '死亡次数' },
  { index: 20, label: '伊甸币' },
  { index: 21, label: '当前连胜' },
  { index: 22, label: '最佳连胜' },
];

let currentSave = null;
let currentFile = null;
let catalogueContext = null;
const localState = loadLocalState();
const filterState = {
  status: 'all', cat: 'all', character: 'all', priority: 'all', q: '', page: 1,
  hideDone: Boolean(localState.hideDone),
};

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const errorBox = document.getElementById('error-box');
const characterSelect = document.getElementById('filter-character');
const prioritySelect = document.getElementById('filter-priority');
const hideCompletedButton = document.getElementById('hide-completed');
const resetManualButton = document.getElementById('reset-manual');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

['dragenter', 'dragover'].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');
}));
dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer.files[0];
  if (file) handleFile(file);
});

document.getElementById('filter-status').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  document.querySelectorAll('#filter-status button').forEach((item) => item.classList.toggle('active', item === button));
  filterState.status = button.dataset.v;
  filterState.page = 1;
  applyFilters();
});

document.getElementById('category-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) setCategoryFilter(button.dataset.v);
});

characterSelect.addEventListener('change', () => {
  filterState.character = characterSelect.value;
  filterState.page = 1;
  applyFilters();
});
prioritySelect.addEventListener('change', () => {
  filterState.priority = prioritySelect.value;
  filterState.page = 1;
  applyFilters();
});
hideCompletedButton.addEventListener('click', () => {
  filterState.hideDone = !filterState.hideDone;
  localState.hideDone = filterState.hideDone;
  saveLocalState();
  syncToolbarState();
  filterState.page = 1;
  applyFilters();
});
resetManualButton.addEventListener('click', () => {
  localState.manualStatus = {};
  saveLocalState();
  refreshAchievementView();
});

document.getElementById('search-box').addEventListener('input', (event) => {
  filterState.q = event.target.value.trim().toLowerCase();
  filterState.page = 1;
  applyFilters();
});
document.getElementById('page-prev').addEventListener('click', () => {
  if (filterState.page > 1) {
    filterState.page--;
    applyFilters(true);
  }
});
document.getElementById('page-next').addEventListener('click', () => {
  filterState.page++;
  applyFilters(true);
});
document.getElementById('page-jump-button').addEventListener('click', jumpToPage);
document.getElementById('page-jump-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') jumpToPage();
});

initializeCatalogue();

function initializeCatalogue() {
  const ids = Object.keys(ACHIEVEMENTS).map(Number).sort((a, b) => a - b);
  catalogueContext = { ids, unlockedSet: new Set(), saveLoaded: false };
  syncSaveDependentUi();
  applyFilters();
}

function loadLocalState() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY) || '{}');
    return {
      manualStatus: value.manualStatus && typeof value.manualStatus === 'object' ? value.manualStatus : {},
      priorityOverrides: value.priorityOverrides && typeof value.priorityOverrides === 'object' ? value.priorityOverrides : {},
      hideDone: Boolean(value.hideDone),
    };
  } catch {
    return { manualStatus: {}, priorityOverrides: {}, hideDone: false };
  }
}

function saveLocalState() {
  try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(localState)); } catch { /* 隐私模式下仍可临时使用。 */ }
}

function showError(message) {
  errorBox.textContent = '❌ ' + message;
  errorBox.hidden = false;
}

async function handleFile(file) {
  errorBox.hidden = true;
  try {
    if (file.size > MAX_SAVE_FILE_BYTES) throw new Error('文件超过 2 MB，不像是有效的以撒持久存档。');
    currentSave = globalThis.IsaacSaveParser.parseSaveFile(await file.arrayBuffer());
    currentFile = file;
    renderResults();
  } catch (error) {
    showError(error.message || String(error));
  }
}

function renderResults() {
  const ids = Object.keys(ACHIEVEMENTS).map(Number).sort((a, b) => a - b);
  const unlockedSet = new Set(ids.filter((id) => currentSave.achievements[id] === 1));
  catalogueContext = { ids, unlockedSet, saveLoaded: true };
  filterState.page = 1;
  renderOverview();
  renderCategories();
  renderStats();
  syncSaveDependentUi();
  applyFilters();
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
}

function renderOverview() {
  const { ids } = catalogueContext;
  const completed = ids.filter(isDone).length;
  const percentage = ((completed / ids.length) * 100).toFixed(1);
  document.getElementById('stat-unlocked').textContent = completed;
  document.getElementById('stat-total').textContent = ids.length;
  document.getElementById('progress-bar').style.width = percentage + '%';
  document.getElementById('progress-pct').textContent = `完成率 ${percentage}%`;

  let meta = `文件：${currentFile.name} · ${(currentFile.size / 1024).toFixed(1)} KB · 存档包含 ${currentSave.achievements.length - 1} 个成就槽位`;
  if (currentSave.crcValid === true) meta += ' · 校验和 ✓';
  if (currentSave.crcValid === false) meta += ' · ⚠ 校验和不匹配（结果仅供参考）';
  if (Object.keys(localState.manualStatus).length) meta += ' · 含手动修正';
  document.getElementById('save-meta').textContent = meta;
}

function renderCategories() {
  const groups = Object.fromEntries(Object.keys(CAT_NAMES).map((cat) => [cat, { total: 0, done: 0 }]));
  for (const id of catalogueContext.ids) {
    const cat = categoryFor(id);
    groups[cat].total++;
    if (isDone(id)) groups[cat].done++;
  }
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';
  for (const [cat, group] of Object.entries(groups)) {
    const percentage = Math.round(group.done / group.total * 100);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cat-item';
    button.dataset.cat = cat;
    button.innerHTML = `<span class="cat-name">${CAT_NAMES[cat]}</span><span class="cat-num">${group.done} / ${group.total}</span><span class="cat-bar"><span style="width:${percentage}%"></span></span>`;
    button.addEventListener('click', () => {
      setCategoryFilter(cat);
      document.getElementById('catalog-title').scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(button);
  }
}

function renderStats() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  if (!currentSave.counters) return;
  for (const stat of KNOWN_STATS) {
    if (stat.index >= currentSave.counters.length) continue;
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `<div class="stat-value">${currentSave.counters[stat.index]}</div><div class="stat-label">${stat.label}</div>`;
    grid.appendChild(item);
  }
}

function categoryFor(id) {
  const type = globalThis.ISAAC_ZH[id].type;
  if (type === '普通角色') return 'normal';
  if (type === '堕化角色') return 'tainted';
  if (type === '解锁挑战' || type === '完成挑战') return 'challenge';
  if (type === '解锁关卡' || type === '通过关卡') return 'level';
  if (type === '角色解锁') return 'character-unlock';
  if (type === 'boss击败') return 'boss';
  return 'other';
}

function isDone(id) {
  if (!catalogueContext.saveLoaded) return false;
  if (Object.prototype.hasOwnProperty.call(localState.manualStatus, id)) return Boolean(localState.manualStatus[id]);
  return catalogueContext.unlockedSet.has(id);
}

function priorityFor(id) {
  if (Object.prototype.hasOwnProperty.call(localState.priorityOverrides, id)) return localState.priorityOverrides[id];
  return globalThis.ISAAC_ZH[id].priority || '';
}

function setCategoryFilter(category) {
  filterState.cat = category;
  filterState.character = 'all';
  filterState.page = 1;
  document.querySelectorAll('#category-tabs button').forEach((button) => {
    const active = button.dataset.v === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  rebuildCharacterFilter();
  applyFilters();
}

function rebuildCharacterFilter() {
  const show = filterState.cat === 'normal' || filterState.cat === 'tainted';
  document.getElementById('character-filter-wrap').hidden = !show;
  characterSelect.innerHTML = '<option value="all">全部人物</option>';
  if (!show || !catalogueContext) return;
  const values = [...new Set(catalogueContext.ids
    .filter((id) => categoryFor(id) === filterState.cat)
    .map((id) => globalThis.ISAAC_ZH[id].character)
    .filter(Boolean))].sort(compareCharacters);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    characterSelect.appendChild(option);
  }
  characterSelect.value = 'all';
}

function compareCharacters(a, b) {
  const normalize = (value) => value.replace(/^堕化/, '');
  const ai = CHARACTER_ORDER.indexOf(normalize(a));
  const bi = CHARACTER_ORDER.indexOf(normalize(b));
  return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b, 'zh-CN');
}

function applyFilters(scrollToGrid = false) {
  if (!catalogueContext) return;
  const matched = catalogueContext.ids.filter((id) => {
    const zh = globalThis.ISAAC_ZH[id];
    const done = isDone(id);
    if (catalogueContext.saveLoaded && filterState.hideDone && done) return false;
    if (catalogueContext.saveLoaded && filterState.status === 'locked' && done) return false;
    if (catalogueContext.saveLoaded && filterState.status === 'unlocked' && !done) return false;
    if (filterState.cat !== 'all' && categoryFor(id) !== filterState.cat) return false;
    if (filterState.character !== 'all' && zh.character !== filterState.character) return false;
    const priority = priorityFor(id);
    if (filterState.priority === 'none' && priority) return false;
    if (filterState.priority !== 'all' && filterState.priority !== 'none' && priority !== filterState.priority) return false;
    if (filterState.q) {
      const haystack = `${id} ${zh.nameZh} ${zh.nameEn} ${zh.unlockZh} ${zh.rewardZh} ${zh.type} ${zh.character}`.toLowerCase();
      if (!haystack.includes(filterState.q)) return false;
    }
    return true;
  });

  if (filterState.cat === 'normal' || filterState.cat === 'tainted') {
    matched.sort((a, b) => compareCharacters(globalThis.ISAAC_ZH[a].character, globalThis.ISAAC_ZH[b].character) || a - b);
  }
  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  filterState.page = Math.min(Math.max(1, filterState.page), totalPages);
  const start = (filterState.page - 1) * PAGE_SIZE;
  const pageIds = matched.slice(start, start + PAGE_SIZE);
  document.getElementById('list-summary').textContent = `符合条件 ${matched.length} 项 · 共 ${catalogueContext.ids.length} 项`;
  renderAchievementCards(pageIds);
  renderPagination(matched.length, totalPages);
  syncToolbarState();
  if (scrollToGrid) document.getElementById('achievement-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAchievementCards(ids) {
  const grid = document.getElementById('achievement-grid');
  grid.innerHTML = '';
  if (!ids.length) {
    grid.innerHTML = '<div class="empty-state">没有找到符合条件的成就。</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  let previousCharacter = null;
  for (const id of ids) {
    const zh = globalThis.ISAAC_ZH[id];
    if ((filterState.cat === 'normal' || filterState.cat === 'tainted') && filterState.character === 'all' && zh.character !== previousCharacter) {
      const heading = document.createElement('h3');
      heading.className = 'achievement-group-title';
      heading.textContent = zh.character || '未分组';
      fragment.appendChild(heading);
      previousCharacter = zh.character;
    }
    fragment.appendChild(createAchievementCard(id));
  }
  grid.appendChild(fragment);
}

function createAchievementCard(id) {
  const zh = globalThis.ISAAC_ZH[id];
  const done = isDone(id);
  const saveLoaded = catalogueContext.saveLoaded;
  const manuallyChanged = saveLoaded && Object.prototype.hasOwnProperty.call(localState.manualStatus, id);
  const priority = priorityFor(id);
  const card = document.createElement('article');
  card.className = `achievement-card ${saveLoaded ? (done ? 'done' : 'locked') : 'neutral'}`;
  card.dataset.id = String(id);
  card.innerHTML = `
    ${saveLoaded ? `<button type="button" class="card-status${manuallyChanged ? ' manual' : ''}" title="${manuallyChanged ? '手动修正；再次点击恢复存档状态' : '点击手动修正状态'}" aria-label="${done ? '已解锁' : '未解锁'}">${done ? '✓' : '🔒'}</button>` : ''}
    <button type="button" class="priority-mark ${priority ? 'has-priority' : ''}" title="点击切换优先级" aria-label="优先级：${priority || '无'}">${priority || '＋优先级'}</button>
    <div class="achievement-icon-wrap">${achievementIconMarkup(id, zh.nameZh)}</div>
    <div class="achievement-body">
      <div class="achievement-kicker"><span>#${id}</span><span>${escapeHtml(zh.character || CAT_NAMES[categoryFor(id)])}</span></div>
      <h3><a href="${escapeHtml(zh.achievementWiki)}" target="_blank" rel="noopener noreferrer">${escapeHtml(zh.nameZh)}</a></h3>
      <p class="english-name">${escapeHtml(zh.nameEn)}</p>
      <div class="unlock-box"><span>解锁条件</span><p>${escapeHtml(zh.unlockZh)}</p></div>
      ${zh.rewardZh ? `<div class="reward-line"><span>解锁奖励</span>${rewardLinksMarkup(zh)}</div>` : '<div class="reward-line no-reward"><span>解锁奖励</span>无奖励</div>'}
    </div>`;

  card.querySelector('.card-status')?.addEventListener('click', () => toggleManualStatus(id));
  card.querySelector('.priority-mark').addEventListener('click', () => cyclePriority(id));
  const sprite = card.querySelector('.achievement-icon-sprite');
  if (sprite) {
    const index = id - 1;
    sprite.style.backgroundImage = `url("${globalThis.ACHIEVEMENT_ATLAS_DATA || 'assets/achievement-atlas.webp'}")`;
    sprite.style.backgroundPosition = `${-(index % ATLAS_COLUMNS) * ATLAS_ICON_SIZE}px ${-Math.floor(index / ATLAS_COLUMNS) * ATLAS_ICON_SIZE}px`;
  }
  const image = card.querySelector('img.achievement-icon');
  if (image) image.addEventListener('error', () => image.classList.add('missing'), { once: true });
  return card;
}

function achievementIconMarkup(id, name) {
  if (id <= 637) return `<span class="achievement-icon achievement-icon-sprite" role="img" aria-label="${escapeHtml(name)}图标"></span>`;
  const source = globalThis.ACHIEVEMENT_ICON_DATA?.[id] || `assets/achievements/${id}.svg`;
  return `<img class="achievement-icon" src="${source}" alt="${escapeHtml(name)}图标" loading="lazy" />`;
}

function rewardLinksMarkup(zh) {
  const links = zh.rewardLinks?.length
    ? zh.rewardLinks
    : [{ name: zh.rewardZh, url: zh.rewardWiki || huijiPageUrl(zh.rewardZh) }];
  return links.map((item) => item.url
    ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>`
    : escapeHtml(item.name)).join('、');
}

function toggleManualStatus(id) {
  if (Object.prototype.hasOwnProperty.call(localState.manualStatus, id)) delete localState.manualStatus[id];
  else localState.manualStatus[id] = !catalogueContext.unlockedSet.has(id);
  saveLocalState();
  refreshAchievementView();
}

function cyclePriority(id) {
  const values = ['', '推荐', '优先'];
  const current = priorityFor(id);
  const next = values[(values.indexOf(current) + 1) % values.length];
  const original = globalThis.ISAAC_ZH[id].priority || '';
  if (next === original) delete localState.priorityOverrides[id];
  else localState.priorityOverrides[id] = next;
  saveLocalState();
  applyFilters();
}

function refreshAchievementView() {
  renderOverview();
  renderCategories();
  applyFilters();
}

function syncToolbarState() {
  hideCompletedButton.classList.toggle('active', filterState.hideDone);
  hideCompletedButton.setAttribute('aria-pressed', String(filterState.hideDone));
  hideCompletedButton.textContent = filterState.hideDone ? '显示已完成' : '隐藏已完成';
  resetManualButton.hidden = !catalogueContext?.saveLoaded || Object.keys(localState.manualStatus).length === 0;
}

function syncSaveDependentUi() {
  const saveLoaded = Boolean(catalogueContext?.saveLoaded);
  document.querySelectorAll('[data-save-only]').forEach((element) => { element.hidden = !saveLoaded; });
  document.getElementById('filter-status').hidden = !saveLoaded;
  hideCompletedButton.hidden = !saveLoaded;
  document.getElementById('status-legend').hidden = !saveLoaded;
  document.getElementById('catalog-note').textContent = saveLoaded
    ? '✓ 为已完成；未完成成就会降低亮度。点击状态可手动修正，点击名称或奖励可打开中文维基。'
    : '尚未导入存档，可直接浏览全部成就。点击名称或奖励可打开中文维基。';
  syncToolbarState();
}

function renderPagination(totalItems, totalPages) {
  const nav = document.getElementById('pagination');
  nav.hidden = totalItems <= PAGE_SIZE;
  document.getElementById('page-info').textContent = `共 ${totalPages} 页`;
  document.getElementById('page-prev').disabled = filterState.page <= 1;
  document.getElementById('page-next').disabled = filterState.page >= totalPages;
  const jumpInput = document.getElementById('page-jump-input');
  jumpInput.max = String(totalPages);
  jumpInput.placeholder = String(filterState.page);

  const numbers = document.getElementById('page-numbers');
  numbers.innerHTML = '';
  for (const token of paginationTokens(filterState.page, totalPages)) {
    if (token === '…') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = token;
      numbers.appendChild(ellipsis);
      continue;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'page-number';
    button.dataset.page = String(token);
    button.textContent = String(token);
    if (token === filterState.page) {
      button.classList.add('active');
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => {
      filterState.page = token;
      applyFilters(true);
    });
    numbers.appendChild(button);
  }
}

function paginationTokens(currentPage, totalPages) {
  const contextSize = 5;
  let start = Math.max(1, currentPage - Math.floor(contextSize / 2));
  let end = Math.min(totalPages, start + contextSize - 1);
  start = Math.max(1, end - contextSize + 1);
  const tokens = [];
  if (start > 1) {
    tokens.push(1);
    if (start > 2) tokens.push('…');
  }
  for (let page = start; page <= end; page++) tokens.push(page);
  if (end < totalPages) {
    if (end < totalPages - 1) tokens.push('…');
    tokens.push(totalPages);
  }
  return tokens;
}

function jumpToPage() {
  const input = document.getElementById('page-jump-input');
  const requested = Number.parseInt(input.value, 10);
  if (!Number.isInteger(requested)) {
    input.focus();
    return;
  }
  const totalPages = Number.parseInt(input.max, 10) || 1;
  filterState.page = Math.min(Math.max(1, requested), totalPages);
  input.value = '';
  applyFilters(true);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function huijiPageUrl(title) {
  return HUIJI_WIKI_PREFIX + String(title).trim().split('/').map((part) => encodeURIComponent(part)).join('/');
}
