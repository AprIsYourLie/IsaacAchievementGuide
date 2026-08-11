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
failures = 0


def check(name, condition):
    global failures
    print(('PASS' if condition else 'FAIL') + '  ' + name)
    if not condition:
        failures += 1


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

        page.click('#category-tabs button[data-v="normal"]')
        check('未导入时可使用分类和人物分组', page.locator('.achievement-card').count() == 32 and page.locator('.achievement-group-title').count() > 0)
        page.click('#category-tabs button[data-v="all"]')
        page.fill('#search-box', 'Magdalene')
        check('未导入时可搜索英文名', page.locator('.achievement-card').count() > 0)
        page.fill('#search-box', '')
        page.fill('#search-box', "There's Options")
        reward_links = page.locator('.achievement-card[data-id="135"] .reward-line a')
        check('成就 #135 显示两个独立奖励链接', reward_links.count() == 2)
        check('成就 #135 奖励分别链接 C249 和 C414',
              reward_links.nth(0).get_attribute('href').endswith('/C249') and
              reward_links.nth(1).get_attribute('href').endswith('/C414'))
        page.fill('#search-box', '')
        page.fill('#search-box', '更多选择')
        check('搜索框可按奖励道具关键词检索', page.locator('.achievement-card[data-id="135"]').count() == 1)
        page.fill('#search-box', '捐献50枚硬币')
        check('搜索框可按解锁条件关键词检索', page.locator('.achievement-card[data-id="135"]').count() == 1)
        page.fill('#search-box', '')
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

        page.fill('#search-box', 'Magdalene')
        check('英文名仍可搜索', page.locator('.achievement-card').count() == 1)

        page.fill('#search-box', '')
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
        with local_page.expect_file_chooser(timeout=5000) as chooser:
            local_page.click('#drop-zone')
        chooser.value.set_files(str(ROOT / 'tools' / 'sample_save.dat'))
        local_page.wait_for_selector('#result-section:not([hidden])', timeout=5000)
        check('file:// 点击可弹出文件选择器并解析', local_page.text_content('#stat-unlocked').strip() == '7')
        check('file:// 页面无 JavaScript 错误', not local_errors)

        # 把单文件版复制到不含任何项目资源的临时目录，模拟只带走一个 HTML。
        standalone_errors = []
        with tempfile.TemporaryDirectory() as temporary_directory:
            isolated_html = Path(temporary_directory) / 'IsaacAchievementGuide-standalone.html'
            shutil.copy2(ROOT / 'IsaacAchievementGuide-standalone.html', isolated_html)
            standalone_page = browser.new_page()
            standalone_page.on('pageerror', lambda error: standalone_errors.append(str(error)))
            standalone_page.goto(isolated_html.as_uri())
            standalone_page.wait_for_selector('.achievement-card', timeout=5000)
            check('隔离单文件未导入时可直接浏览', standalone_page.locator('.achievement-card.neutral').count() == 32)
            standalone_page.set_input_files('#file-input', str(ROOT / 'tools' / 'sample_save.dat'))
            standalone_page.wait_for_selector('#result-section:not([hidden])', timeout=5000)
            check('单文件版离开项目文件夹后仍可解析', standalone_page.text_content('#stat-unlocked').strip() == '7')
            icon_style = standalone_page.locator('.achievement-card .achievement-icon-sprite').first.get_attribute('style')
            check('单文件版图集已经内嵌', 'data:image/webp;base64' in icon_style)
            check('单文件版无 JavaScript 错误', not standalone_errors)
            standalone_page.close()

        browser.close()
finally:
    httpd.shutdown()

print('\n全部通过' if failures == 0 else f'\n{failures} 项失败')
sys.exit(0 if failures == 0 else 1)
