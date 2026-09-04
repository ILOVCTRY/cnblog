# CNB Notes 页面排查交接

更新时间：2026-09-04（Asia/Shanghai）

## 任务目标

检查线上页面 <https://www.cnblogs.com/MillionMind/p/> 的实际显示和交互问题，并在后续会话中修复、部署后复测。

当前阶段只完成了线上排查和 Browser 插件安装，尚未修改主题代码。

## 仓库状态

- 仓库：`E:\ILOVCTRY\cnblog`
- 分支：`master`
- 当前提交：`1aef20a`
- 本轮排查前工作区已经存在未提交修改，属于用户，不能 reset、checkout 或覆盖：

```text
 M docs/install.md
 M theme/cnblogs.css
 M theme/cnblogs.js
 M theme/config.js
 M theme/footer.html
 M theme/header.html
 M theme/sidebar.html
?? .cover-audit.ps1
?? .trae/
```

开始修复前先重新执行 `git status --short` 和 `git diff -- <目标文件>`，在当前修改之上继续工作。

## Browser 插件状态

已安装并启用 OpenAI 内置 Browser 插件：

```text
browser@openai-bundled
version: 26.901.20858
status: installed, enabled
```

验证命令：

```powershell
codex plugin list --marketplace openai-bundled
codex doctor --summary --ascii --no-color
```

安装后 `codex doctor` 结果为 `0 fail`。插件写入了 `C:\Users\Nan\.codex\config.toml`；当前旧会话无法动态刷新工具，新会话应能看到 Browser / `control-in-app-browser` skill。新会话必须先完整阅读该 skill，再按其要求连接 Browser，不要直接退回普通 Playwright。

本机 HTTP/HTTPS 代理为 `127.0.0.1:7890`。线上博客本身可直连；GitHub/raw/jsDelivr 不稳定时可使用该代理。

## 已确认问题

### P0：全屏加载遮罩可能永久阻断页面

用户现象：页面长期停留在“请打开代理访问。”，正文不可见、不可点击。桌面 `1440x1000` 和手机 `390x844` 均已复现。

相关代码：

- `theme/header.html:2` 创建 `#cn-page-loader`，文案在 `theme/header.html:5`。
- `theme/cnblogs.css:97` 将遮罩固定为全屏、`z-index:1000` 且接管指针事件。
- `theme/cnblogs.js:11` 定义关闭逻辑，但 `theme/cnblogs.js:16-17` 只在 `document.readyState === 'complete'` 或 `window.load` 后执行。
- `theme/config.js:8` 的 Logo 使用 jsDelivr 图片地址。

根因证据：Logo 的 jsDelivr URL 会 `301` 到 `raw.githubusercontent.com`；本机直连最终地址 20 秒无响应，代理下返回 `200`。非关键图片迟迟不能完成时，`window.load` 不触发，遮罩就不会关闭。代理复测也出现过间歇性再次卡住，因此“打开代理”不是可靠修复。

更严重的一点是：负责移除遮罩的 `cnblogs.js` 本身也由外部 CDN 加载。若主题脚本加载失败，遮罩同样永远存在。

建议：删除阻断式全屏 Loader，或者至少改成 fail-open：在页首内联最小关闭逻辑，在 `DOMContentLoaded` 或 2-3 秒 watchdog 到期时无条件移除；任何 Logo、壁纸、封面失败都不能影响正文可用性。文案应改成普通的“正在加载”，不能要求访问者配置代理。

### P1：移动端导航竖排并发生点击区域重叠

在 `390x844` 下：

- “新随笔”被压成竖排，元素高度达到 82px。
- `GitHub` 与明暗主题按钮相交，实测重叠面积为 216 px²（约 6px 宽）。
- 页头整体显得拥挤，触控目标不可靠。

相关样式位于 `theme/cnblogs.css:841` 附近的 `@media (max-width:640px)`；目前只是缩小 gap 和 padding，并允许导航横向滚动，没有为品牌、5 个链接和主题按钮建立稳定宽度或折叠方案。

建议：移动端使用菜单/折叠导航，或至少给导航链接 `flex:0 0 auto; white-space:nowrap`，并确保 actions 不被覆盖。验收时必须检查可见区域与点击区域都不相交。

### P1：移动端先显示完整侧栏，正文约两个屏幕后才出现

实测 `390x844`：

- `#sideBar`：`y=99..1769`，高度 1670px。
- `#main`：从 `y=1797` 开始。
- “我的随笔”标题：`y=1841`。

`theme/cnblogs.js:19-24` 会把 `#sideBar` 提升并插到 `#main` 之前；`theme/cnblogs.css:823` 附近切成单列时没有重新排序，于是手机先渲染公告、日历、搜索、链接、标签、归档和排行榜，之后才是文章。

建议：窄屏明确设置 `#main { order:1 }`、`#sideBar { order:2 }`，或只保留折叠后的侧栏入口。首屏应出现文章列表而不是完整侧栏。

### P1：分页器重复并破坏双列对齐

桌面和手机都存在两套分页器，而且都出现在文章之前。

桌面 `1440x1000`：

- 一个分页器横跨内容区。
- 第二个分页器进入 `#myposts` 左列。
- 左列第一张卡片从 `y=564` 开始，右列第一张从 `y=402` 开始，相差 162px。

手机 `390x844`：两套分页器连续出现在 `y=1934` 和 `y=2090`，第一张文章卡片到 `y=2274` 才出现。

相关逻辑位于 `theme/cnblogs.js:378-415`。脚本创建 `.cn-post-columns` 并把整个 `#myposts` 放入左列，但博客园原有分页节点有一部分嵌套在 `#myposts` 中，因而一起进入左列。CSS 对顶/底分页的 `order` 规则位于 `theme/cnblogs.css:381-395`。

建议：重组卡片前先识别并提取顶部、底部分页节点；`.cn-post-columns` 只能包含文章列。确定产品选择后保留一套顶部或底部分页，或者正确保持“顶部一套 + 底部一套”，但两列文章必须从同一纵坐标开始。

### P2：站点 Logo 链接错误

`theme/header.html:10` 使用 `href="/"`。线上点击会进入 `https://www.cnblogs.com/`，不是 MillionMind 博客首页。

建议改为 `/MillionMind/`，或从配置中读取博客首页 URL。

### P3：百度统计请求失败

代理复测时 `https://hm.baidu.com/hm.js?866c9be12d4a814454792b1fd0fed295` 出现 `net::ERR_CONNECTION_CLOSED`。没有观察到由此产生的页面脚本异常，优先级低；修复核心问题后再决定是否移除或忽略。

## 已通过的交互

- 页面本身返回 HTTP `200`，标题为“我的随笔 - MillionMind - 博客园”。
- DOM 中有 10 张文章卡片，不是空白页。
- 明暗主题按钮可把 `data-cn-theme` 从 `light` 切换到 `dark`。
- 桌面搜索按钮可弹出“搜索文章...”输入框。
- 分页链接可以导航到 `https://www.cnblogs.com/MillionMind/p/?page=2`，第 2 页标题和 10 张卡片正常出现。
- 未发现未捕获的 `pageerror`。
- 代理资源加载成功的一轮中，没有破损图片和横向页面溢出。

这些通过项不代表整体可交付；Loader、手机首屏和分页布局仍是阻断问题。

## 测试证据

截图保存在系统临时目录，没有写入仓库：

```text
C:\Users\Nan\AppData\Local\Temp\millionmind-desktop.png
C:\Users\Nan\AppData\Local\Temp\millionmind-desktop-proxy.png
C:\Users\Nan\AppData\Local\Temp\millionmind-mobile-proxy.png
```

- `millionmind-desktop.png`：直连时永久 Loader。
- `millionmind-desktop-proxy.png`：资源加载后可见桌面分页重复、左/右列错位。
- `millionmind-mobile-proxy.png`：移动端导航重叠、侧栏先于正文、双分页。

临时目录文件可能被系统清理；下一会话应使用 Browser 重新截图作为修复前基线。

## 推荐接手顺序

1. 用 Browser 打开线上 URL，在 `1440x1000` 和 `390x844` 重建当前基线；记录 URL、标题、DOM、console 和截图。
2. 在现有未提交修改之上修复 Loader，先保证无代理、图片失败、主题脚本失败时正文仍可访问。
3. 修复移动端导航和内容顺序。
4. 修复分页节点重组和双列对齐。
5. 修正 Logo 链接。
6. 本地进行语法检查；若没有测试工程，可用 `node --check theme/cnblogs.js`。
7. 部署后用 Browser 重测线上页面，而不是只看本地文件或构建结果。

## Browser 验收矩阵

至少覆盖：

| 场景 | 期望 |
| --- | --- |
| 桌面首屏 `1440x1000` | 3 秒内正文可操作，无永久遮罩 |
| 手机首屏 `390x844` | 页头不重叠，首屏或紧邻首屏能看到文章列表 |
| 外部 Logo/封面失败 | 正文、导航和分页仍可使用 |
| 分页 | 无意外重复；两列起点对齐；可进入第 2 页 |
| 主题切换 | `light`/`dark` 状态变化且布局不跳动 |
| 搜索 | 桌面按钮及 `Ctrl+K` 可触发搜索 |
| Console | 无主题自身异常；第三方统计失败可单独注明 |
| 页面宽度 | 桌面和手机均无横向溢出 |

修改主题后还要检查首页、随笔列表页、文章详情页、标签/归档页，因为 `#home`、`#main`、`.forFlow` 和分页规则是共享的。

## 部署注意

线上页脚当前引用固定提交：

```text
efe730d019a20d595316bf5db0ee37a60cb81b09
```

见 `theme/footer.html:10-11`。本地 `docs/install.md` 还出现另一个固定 SHA。修复后若要上线，需要：

1. 提交并推送代码（必须由用户明确授权）。
2. 把博客园页脚的 `config.js` / `cnblogs.js` URL 更新为实际新提交 SHA。
3. 将 CSS、页首 HTML、页脚 HTML、侧栏公告按改动范围同步到博客园后台。
4. 强制刷新并用 Browser 验证线上真实资源版本。

不要只修改 `@main` 查询参数；现有安装文档已说明 jsDelivr 缓存可能不会因此刷新。

## 新会话开场提示

可直接对新会话说：

> 阅读 `docs/handoff.md` 并接手。使用已安装的 Browser 插件先复现线上页面问题，然后在保留当前未提交修改的前提下修复 Loader、移动端导航/内容顺序、重复分页和 Logo 链接，完成桌面与手机端 Browser 验证。未经我明确授权不要提交、推送或修改博客园后台。
