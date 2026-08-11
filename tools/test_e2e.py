#!/usr/bin/env python
"""启动静态服务器，在 HTTP 和 file:// 两种方式下验证上传与卡片渲染。"""
import functools
import http.server
import socketserver
import shutil
import sys
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

PORT = 8791
ROOT = Path(__file__).resolve().parents[1]
SEARCH_SETTLE_MS = 260
failures = 0


def check(name, condition):
    global failures
    print(('PASS' if condition else 'FAIL') + '  ' + name)
    if not condition:
        failures += 1


def fill_search(page, value):
    page.fill('#search-box', value)
    page.wait_for_timeout(SEARCH_SETTLE_MS)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
httpd = ReusableTCPServer(('127.0.0.1', PORT), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{PORT}/index.html')

        page.wait_for_selector('.achievement-card', timeout=5000)
        wiki_home = page.locator('.wiki-home-link')
        check('图鉴标题区域包含中文维基入口', wiki_home.inner_text() == '以撒的结合中文维基')
        check('中文维基入口在新标签页打开', wiki_home.get_attribute('target') == '_blank' and '%E9%A6%96%E9%A1%B5' in wiki_home.get_attribute('href'))
        check('未导入存档即可显示 32 张卡片', page.locator('.achievement-card').count() == 32)
        check('641 项分页缩减为 21 页', '共 21 页' in page.text_content('#page-info'))
        page_buttons = page.locator('#page-numbers .page-number')
        check('分页显示前后五页上下文及末页', page_buttons.all_inner_texts() == ['1', '2', '3', '4', '5', '21'])
        page.locator('#page-numbers .page-number[data-page="3"]').click()
        check('数字页码可直接翻到第 3 页', page.locator('.page-number.active').inner_text() == '3' and page.locator('.achievement-card').first.get_attribute('data-id') == '65')
        page.fill('#page-jump-input', '21')
        page.click('#page-jump-button')
        check('页码跳转可前往第 21 页', page.locator('.page-number.active').inner_text() == '21' and page.locator('.achievement-card[data-id="641"]').count() == 1)
        page.fill('#page-jump-input', '1')
        page.press('#page-jump-input', 'Enter')
        check('页码输入支持回车跳转', page.locator('.page-number.active').inner_text() == '1')
        check('未导入时卡片为中性状态', page.locator('.achievement-card.neutral').count() == 32)
        check('未导入时不显示勾选或锁定', page.locator('.achievement-card .card-status').count() == 0)
        check('未导入时隐藏存档统计', page.locator('[data-save-only]').first.is_hidden())
        check('未导入时隐藏状态筛选', page.locator('#filter-status').is_hidden())
        check('卡片已删除重复成就描述', page.locator('.achievement-desc').count() == 0)
        check('卡片已删除底部类别文字', page.locator('.type-line').count() == 0)
        reward_links_5 = page.locator('.achievement-card[data-id="5"] .reward-line a')
        check('成就 #5 显示四大骑士的独立链接', reward_links_5.count() == 4)
        check('成就 #5 分别链接四大骑士实体页面',
              [reward_links_5.nth(index).get_attribute('href').split('/')[-1]
               for index in range(4)] == [
                   '63#63.0.0', '64#64.0.0', '65#65.0.0', '66#66.0.0'
               ])
        reward_links_6 = page.locator('.achievement-card[data-id="6"] .reward-line a')
        check('成就 #6 显示肉块和绷带球两个奖励链接', reward_links_6.count() == 2)
        check('成就 #6 奖励分别链接 C73 和 C207',
              reward_links_6.nth(0).get_attribute('href').endswith('/C73') and
              reward_links_6.nth(1).get_attribute('href').endswith('/C207'))
        page.locator('#page-numbers .page-number[data-page="2"]').click()
        reward_33 = page.locator('.achievement-card[data-id="33"] .reward-line')
        check('成就 #33 分开显示难度增加和半魂心',
              reward_33.inner_text() == '解锁奖励\n普通模式与困难模式难度增加、半魂心')
        check('成就 #33 仅半魂心带中文维基链接',
              reward_33.locator('a').count() == 1 and
              reward_33.locator('a').inner_text() == '半魂心' and
              '%E5%8D%8A%E9%AD%82%E5%BF%83' in reward_33.locator('a').get_attribute('href'))
        page.locator('#page-numbers .page-number[data-page="1"]').click()

        fill_search(page, '解锁"地窖"')
        reward_86 = page.locator('.achievement-card[data-id="86"] .reward-line')
        check('解锁关卡成就仅链接关卡部分',
              reward_86.inner_text() == '解锁奖励\n解锁"地窖"' and
              reward_86.locator('a').inner_text() == '"地窖"' and
              '%E5%9C%B0%E7%AA%96' in reward_86.locator('a').get_attribute('href'))
        fill_search(page, '解锁挑战#4：黑暗降临')
        reward_157 = page.locator('.achievement-card[data-id="157"] .reward-line')
        check('解锁挑战成就仅链接挑战部分',
              reward_157.inner_text() == '解锁奖励\n解锁挑战#4：黑暗降临' and
              reward_157.locator('a').inner_text() == '挑战#4：黑暗降临' and
              reward_157.locator('a').get_attribute('href').endswith('/4'))

        fill_search(page, '六面骰 + 以撒初始携带')
        reward_29 = page.locator('.achievement-card[data-id="29"] .reward-line')
        check('成就 #29 仅链接两处六面骰和人物名称',
              reward_29.locator('a').all_inner_texts() == ['六面骰', '以撒', '六面骰'] and
              reward_29.inner_text() == '解锁奖励\n六面骰 + 以撒初始携带"六面骰"')
        fill_search(page, '店主初始额外拥有一个心之容器')
        reward_191 = page.locator('.achievement-card[data-id="191"] .reward-line')
        check('成就 #191 去除重复店主并仅链接人物名称',
              '店主店主' not in reward_191.inner_text() and
              reward_191.locator('a').all_inner_texts() == ['店主', '店主'])
        fill_search(page, '脆皮虫、粪山幼崽')
        check('成就 #346 显示并链接全部八个敌人',
              page.locator('.achievement-card[data-id="346"] .reward-line a').count() == 8)
        fill_search(page, '骨堆畸胎、超级绷带人')
        check('成就 #347 显示并链接全部八个敌人',
              page.locator('.achievement-card[data-id="347"] .reward-line a').count() == 8)
        fill_search(page, '隐藏房和错误房生成的道具')
        reward_593 = page.locator('.achievement-card[data-id="593"] .reward-line')
        check('成就 #593 分别链接三个目标词条',
              reward_593.locator('a').all_inner_texts() == ['隐藏房', '错误房', '错误道具'])
        fill_search(page, '')

        page.click('#category-tabs button[data-v="normal"]')
        check('未导入时可使用分类和人物分组', page.locator('.achievement-card').count() == 32 and page.locator('.achievement-group-title').count() > 0)
        page.click('#category-tabs button[data-v="all"]')

        page.fill('#search-box', '115')
        check('搜索输入后不会立即重绘卡片', page.locator('.achievement-card').count() == 32)
        page.wait_for_timeout(SEARCH_SETTLE_MS)
        check('停止输入后搜索成就 #115', page.locator('.achievement-card[data-id="115"]').count() == 1 and page.locator('.achievement-card').count() == 1)
        page.fill('#search-box', '11')
        check('从 115 删除为 11 时保留旧结果等待输入结束', page.locator('.achievement-card[data-id="115"]').count() == 1 and page.locator('.achievement-card').count() == 1)
        page.wait_for_timeout(SEARCH_SETTLE_MS)
        check('停止删除后更新 11 的搜索结果', page.locator('.achievement-card').count() == 21)

        page.fill('#search-box', '115')
        page.press('#search-box', 'Enter')
        check('搜索框回车可立即触发', page.locator('.achievement-card[data-id="115"]').count() == 1 and page.locator('.achievement-card').count() == 1)
        page.evaluate("window.__searchCardBeforeEnter = document.querySelector('.achievement-card')")
        page.press('#search-box', 'Enter')
        check('相同关键词回车不会重复渲染', page.evaluate("document.querySelector('.achievement-card') === window.__searchCardBeforeEnter"))

        page.fill('#search-box', '')
        page.press('#search-box', 'Enter')
        page.fill('#search-box', '1')
        page.wait_for_timeout(50)
        page.fill('#search-box', '11')
        page.wait_for_timeout(50)
        page.fill('#search-box', '115')
        check('连续快速输入期间不刷新中间结果', page.locator('.achievement-card').count() == 32)
        page.wait_for_timeout(SEARCH_SETTLE_MS)
        check('连续快速输入只应用最终关键词', page.locator('.achievement-card[data-id="115"]').count() == 1 and page.locator('.achievement-card').count() == 1)

        page.evaluate("""() => {
          const input = document.querySelector('#search-box');
          input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: 'gengduo' }));
          input.value = '更多选择';
          input.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            data: '更多选择',
            inputType: 'insertCompositionText',
            isComposing: true,
          }));
        }""")
        page.wait_for_timeout(SEARCH_SETTLE_MS)
        check('中文输入法选字期间不刷新结果', page.locator('.achievement-card[data-id="115"]').count() == 1)
        page.evaluate("""() => {
          document.querySelector('#search-box').dispatchEvent(
            new CompositionEvent('compositionend', { bubbles: true, data: '更多选择' })
          );
        }""")
        page.wait_for_timeout(SEARCH_SETTLE_MS)
        check('中文输入法选字结束后执行搜索', page.locator('.achievement-card[data-id="135"]').count() == 1)

        fill_search(page, 'Magdalene')
        check('未导入时可搜索英文名', page.locator('.achievement-card').count() > 0)
        fill_search(page, "There's Options")
        reward_links = page.locator('.achievement-card[data-id="135"] .reward-line a')
        check('成就 #135 显示两个独立奖励链接', reward_links.count() == 2)
        check('成就 #135 奖励分别链接 C249 和 C414',
              reward_links.nth(0).get_attribute('href').endswith('/C249') and
              reward_links.nth(1).get_attribute('href').endswith('/C414'))
        fill_search(page, '更多选择')
        check('搜索框可按奖励道具关键词检索', page.locator('.achievement-card[data-id="135"]').count() == 1)
        fill_search(page, '捐献50枚硬币')
        check('搜索框可按解锁条件关键词检索', page.locator('.achievement-card[data-id="135"]').count() == 1)
        fill_search(page, '')
        page.select_option('#filter-priority', '推荐')
        check('未导入时可筛选优先级', page.locator('.achievement-card').count() == 32)
        page.select_option('#filter-priority', 'all')

        page.set_input_files('#file-input', str(ROOT / 'tools' / 'sample_save.dat'))
        page.wait_for_selector('[data-save-only]:not([hidden])', timeout=5000)

        check('页面无 JavaScript 错误', not errors)
        check('合成存档解锁数为 7', page.text_content('#stat-unlocked').strip() == '7')
        check('总成就数为 641', page.text_content('#stat-total').strip() == '641')
        check('完成率为 1.1%', '1.1%' in page.text_content('#progress-pct'))
        check('校验和有效', '校验和 ✓' in page.text_content('#save-meta'))
        check('统计计数器使用正确编号', page.locator('#stats-grid .stat-item').all_inner_texts() == [
            '77\n妈妈击杀数', '42\n死亡次数', '13\n伊甸币', '5\n当前连胜', '9\n最佳连胜'
        ])

        cards = page.locator('.achievement-card')
        check('导入后默认分页显示 32 张卡片', cards.count() == 32)
        check('首张卡片使用中文名称', page.locator('.achievement-card').first.locator('h3').inner_text() == '抹大拉')
        first_icon_style = page.locator('.achievement-card').first.locator('.achievement-icon-sprite').get_attribute('style')
        check('首张卡片使用本地图集图标', 'achievement-atlas.webp' in first_icon_style)
        check('成就名称链接到中文维基 ID 页面', page.locator('.achievement-card').first.locator('h3 a').get_attribute('href').endswith('/1'))
        check('卡片显示解锁条件', '解锁条件' in page.locator('.achievement-card').first.inner_text())

        page.click('#filter-status button[data-v="locked"]')
        check('未解锁筛选计数为 634', '634 项' in page.text_content('#list-summary'))
        check('未解锁卡片带 locked 类', page.locator('.achievement-card.locked').count() == 32)

        page.click('#filter-status button[data-v="unlocked"]')
        check('已解锁筛选显示 7 张卡片', page.locator('.achievement-card').count() == 7)
        check('已解锁卡片显示勾选', page.locator('.achievement-card.done .card-status').first.inner_text() == '✓')

        fill_search(page, 'Magdalene')
        check('英文名仍可搜索', page.locator('.achievement-card').count() == 1)

        fill_search(page, '')
        page.click('#filter-status button[data-v="all"]')
        page.click('#category-tabs button[data-v="normal"]')
        check('普通角色分类每页显示 32 张卡片', page.locator('.achievement-card').count() == 32)
        check('普通角色按人物显示分组标题', page.locator('.achievement-group-title').count() > 0)
        check('人物筛选器在角色分类显示', page.locator('#character-filter-wrap').is_visible())

        page.click('#category-tabs button[data-v="all"]')
        page.locator('.achievement-card[data-id="1"] .card-status').click()
        check('点击状态可手动修正完成数', page.text_content('#stat-unlocked').strip() == '6')
        check('手动修正会显示清除按钮', page.locator('#reset-manual').is_visible())
        page.locator('.achievement-card[data-id="1"] .card-status').click()
        check('再次点击恢复存档状态', page.text_content('#stat-unlocked').strip() == '7')

        page.locator('.achievement-card[data-id="1"] .priority-mark').click()
        check('优先级可切换为推荐', page.locator('.achievement-card[data-id="1"] .priority-mark').inner_text() == '推荐')
        page.select_option('#filter-priority', '推荐')
        check('优先级筛选保留推荐项', page.locator('.achievement-card[data-id="1"]').count() == 1)
        page.select_option('#filter-priority', 'all')

        page.click('#hide-completed')
        check('隐藏已完成后剩余 634 项', '634 项' in page.text_content('#list-summary'))
        page.click('#hide-completed')
        page.screenshot(path=str(ROOT / 'tools' / 'e2e_screenshot.png'), full_page=True)

        local_page = browser.new_page()
        local_errors = []
        local_page.on('pageerror', lambda error: local_errors.append(str(error)))
        local_page.goto((ROOT / 'index.html').as_uri())
        local_page.wait_for_selector('.achievement-card', timeout=5000)
        check('file:// 未导入时可直接浏览 32 项', local_page.locator('.achievement-card.neutral').count() == 32)
        fill_search(local_page, '115')
        check('file:// 支持延迟搜索', local_page.locator('.achievement-card[data-id="115"]').count() == 1)
        fill_search(local_page, '')
        with local_page.expect_file_chooser(timeout=5000) as chooser:
            local_page.click('#drop-zone')
        chooser.value.set_files(str(ROOT / 'tools' / 'sample_save.dat'))
        local_page.wait_for_selector('#result-section:not([hidden])', timeout=5000)
        check('file:// 点击可弹出文件选择器并解析', local_page.text_content('#stat-unlocked').strip() == '7')
        check('file:// 页面无 JavaScript 错误', not local_errors)

        # 把单独文件版复制到不含任何项目资源的临时目录，模拟只带走一个 HTML。
        standalone_errors = []
        with tempfile.TemporaryDirectory() as temporary_directory:
            isolated_html = Path(temporary_directory) / 'IsaacAchievementGuide-standalone.html'
            shutil.copy2(ROOT / 'IsaacAchievementGuide-standalone.html', isolated_html)
            standalone_page = browser.new_page()
            standalone_page.on('pageerror', lambda error: standalone_errors.append(str(error)))
            standalone_page.goto(isolated_html.as_uri())
            standalone_page.wait_for_selector('.achievement-card', timeout=5000)
            check('隔离单文件未导入时可直接浏览', standalone_page.locator('.achievement-card.neutral').count() == 32)
            fill_search(standalone_page, '115')
            check('隔离单文件支持延迟搜索', standalone_page.locator('.achievement-card[data-id="115"]').count() == 1)
            fill_search(standalone_page, '')
            standalone_page.set_input_files('#file-input', str(ROOT / 'tools' / 'sample_save.dat'))
            standalone_page.wait_for_selector('#result-section:not([hidden])', timeout=5000)
            check('单独文件版离开项目文件夹后仍可解析', standalone_page.text_content('#stat-unlocked').strip() == '7')
            icon_style = standalone_page.locator('.achievement-card .achievement-icon-sprite').first.get_attribute('style')
            check('单独文件版图集已经内嵌', 'data:image/webp;base64' in icon_style)
            check('单独文件版无 JavaScript 错误', not standalone_errors)
            standalone_page.close()

        browser.close()
finally:
    httpd.shutdown()

print('\n全部通过' if failures == 0 else f'\n{failures} 项失败')
sys.exit(0 if failures == 0 else 1)
