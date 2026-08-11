# Isaac Achievement Guide

一个面向《以撒的结合：重生》的非官方中文成就图鉴与存档检测网页，支持 Repentance 和 Repentance+。

无需导入存档即可浏览全部成就。导入 `persistentgamedata*.dat` 后，可以查看完成率、已解锁和未解锁成就。存档只会在浏览器本地解析，不会上传到服务器，也不会修改原文件。

## v1.0.0

- 收录 641 项成就，包括 Repentance+ 新增的 ID 638–641。
- 显示中文成就名、英文名、解锁条件、解锁奖励和成就图标。
- 支持按分类、人物、完成状态和优先级筛选。
- 支持搜索成就名、奖励道具、解锁条件和成就编号。
- 成就名称和奖励道具可以跳转到以撒中文维基。
- 支持隐藏已完成、手动修正状态以及推荐/优先标记。
- 支持直接双击运行，也可以通过 GitHub Pages 在线使用。

## 使用方法

1. 下载单独文件版 [IsaacAchievementGuide-standalone.html](./IsaacAchievementGuide-standalone.html)。在 GitHub 文件页面中点击右上角的 **Download raw file** 即可下载。
2. 双击打开下载的 HTML 文件，即可直接浏览完整成就图鉴。
3. 如需检测完成进度，点击页面顶部的存档选择区域，选择 `persistentgamedata*.dat`。

常见存档位置：

```text
C:\Users\<用户名>\Documents\My Games\Binding of Isaac Repentance\
C:\Users\<用户名>\Documents\My Games\Binding of Isaac Repentance+\
Steam\userdata\<SteamID>\250900\remote\
```

请选择 `persistentgamedata` 持久存档，不要选择 `gamestate` 单局存档。文件名结尾的 `1`、`2`、`3` 对应游戏内的三个存档位。
