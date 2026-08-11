# Third-party notices

本项目在存档格式研究、校验和实现和成就数据整理过程中参考了以下资料。

## isaac-save-viewer

- 项目：https://github.com/Zamiell/isaac-save-viewer
- 作者：Zamiell 及项目贡献者
- 许可：GNU General Public License v3.0
- 用途：存档区块结构、Kaitai Struct 定义和成就数据交叉验证。

本仓库采用 GPL-3.0，以保持与该参考实现的授权要求一致。为保证交叉测试可以独立运行，`tools/reference/` 仅保留该项目生成的 `KaitaiStream.js` 与 `IsaacSaveFile.js`；成就图标 1–637 由参考项目的成就资源整理而来。

## isaac-save-edit-script

- 项目：https://github.com/jamesthejellyfish/isaac-save-edit-script
- 作者：jamesthejellyfish
- 许可：MIT License
- 用途：自定义 CRC 校验算法的实现参考。

Copyright (c) 2023 jamesthejellyfish

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## The Binding of Isaac: Rebirth Wiki

- 成就页：https://bindingofisaacrebirth.wiki.gg/wiki/Achievement
- Repentance+ 数据页：https://bindingofisaacrebirth.wiki.gg/wiki/Achievements/Repentance%2B
- 内容许可：Creative Commons Attribution-ShareAlike 4.0 International（除非页面另有说明）
- 用途：成就名称、游戏内描述和解锁条件。

对 wiki 文本所做的主要改动是结构化、分类和格式清理。再利用这些内容时仍需保留署名并遵守 CC BY-SA 4.0。

## 以撒的结合中文维基（灰机 wiki）

- 首页：https://isaac.huijiwiki.com/wiki/首页
- 成就页：https://isaac.huijiwiki.com/wiki/成就
- 数据页：https://isaac.huijiwiki.com/wiki/Data:Achievement.tabx
- 用途：中文角色名、成就名、说明文字、解锁条件、奖励和成就 ID 的术语参考。

该站的授权说明指出，部分内容翻译自英文 wiki，原创的物品测试等内容按 CC BY-NC-SA 3.0 分享。中文显示数据与 GPL 代码分文件保存并保留来源；当前仅导入成就表中的简短事实字段，不复制攻略正文。

## 用户提供的“以撒全成就完成清单1.2”

- 用途：交叉核对 1–637 号成就的中文名称、简短解锁条件、奖励、分类、人物分组、优先级与中文维基链接。
- 项目仅保留经脚本提取的结构化事实字段；原 HTML、界面代码、图集、网络代理和用户设置功能均未复制。
- 原清单未包含 638–641 号 Repentance+ 联机成就，本项目单独补充并明确区分。

## Game content

《The Binding of Isaac》及相关名称、商标和游戏内容属于其各自权利人。项目包含用于识别成就的低分辨率图标；638–641 使用本项目自行绘制的替代图标。项目不包含游戏音频或完整美术资源，也不声称得到官方认可。
