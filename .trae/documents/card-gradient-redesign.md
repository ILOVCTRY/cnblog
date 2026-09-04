# 博客园卡片封面图 + 文章详情页 Hero Banner 设计方案

## Summary

两大功能：

1. **文章列表卡片**：每张卡片顶部有封面背景图，标题覆盖在图片上
2. **文章详情页**：顶部全宽 Hero Banner，放大的同一封面图 + 随机名言名句

封面图通过博客园侧边栏公告配置壁纸池，新文章自动从池中按标题 hash 分配固定封面，无需改 GitHub。支持侧边栏手动覆盖和正文 `<!--cover:url-->` 标记。

## Current State Analysis

现有文件：

- `theme/cnblogs.css` — 已有 `.cn-post-card` 卡片基础结构

- `theme/cnblogs.js` — 已有 `.day` → `.cn-post-card` DOM 重组逻辑

- `theme/config.js` — 基础配置（GitHub 维护）

- `theme/header.html` — 顶部导航 HTML（贴入博客园"页首 HTML"）

博客园可编辑区域：

- **页首 HTML** — 已用于 header

- **页脚 HTML** — 已用于 footer + 加载 config.js + cnblogs.js

- **侧边栏公告 HTML** — **尚未使用，是放置壁纸池/名言的最佳位置**（直接在博客园后台编辑，不碰 GitHub）

关键优势：侧边栏 HTML 在博客园后台即可编辑，写入 `<script>` 定义 `window.CNB_COVER_POOL` 等全局变量，JS 直接读取。发新文章无需改任何代码。

## Proposed Changes

### 1. 博客园侧边栏公告 HTML（用户在博客园后台编辑）

用户将以下内容贴入博客园「设置 → 侧边栏公告」：

```html
<!-- 博客园侧边栏公告 — 壁纸池 + 名言 + 覆盖表 -->
<script>
window.CNB_COVER_POOL = [
  // 上传到博客园文件系统，把 URL 贴在这里
  'https://files.cnblogs.com/MillionMind/banners/cover1.jpg',
  'https://files.cnblogs.com/MillionMind/banners/cover2.jpg',
  'https://files.cnblogs.com/MillionMind/banners/cover3.jpg',
  // ... 添加更多
];
window.CNB_COVER_MAP = {
  // 可选：为特定文章手动指定封面（标题完全匹配）
  // '堆基础': 'https://files.cnblogs.com/MillionMind/banners/heap.jpg',
};
window.CNB_QUOTES = [
  '代码是写给人看的，只是恰好能被机器执行。',
  '安全不是一种产品，而是一种过程。',
  'Talk is cheap, show me the code.',
  'Stay hungry, stay foolish.',
  '越简单越安全，越复杂越脆弱。',
  // ... 添加更多
];
</script>
```

**操作流程**：

1. 首次：把壁纸图片上传到博客园文件系统，复制 URL 填入 `CNB_COVER_POOL`
2. 发新文章：无需任何操作，JS 自动按标题 hash 从池中分配一张固定封面
3. 想改某篇封面：在 `CNB_COVER_MAP` 加一行 `'文章标题': '新URL'`
4. 想加更多名言：在 `CNB_QUOTES` 数组加字符串

### 2. CSS — 列表卡片封面样式 (`theme/cnblogs.css`)

重写 `.cn-post-card` 区域（约 250-320 行）：

**卡片 DOM 结构**变为：

```html
<article class="cn-post-card cn-reveal">
  <div class="cn-post-card__cover" style="--cn-card-cover:url(...)">
    <span class="cn-post-card__date">日期</span>
    <h3 class="cn-post-card__title"><a>标题</a></h3>
  </div>
  <div class="cn-post-card__body">
    <div class="postBody">摘要...</div>
    <div class="postDesc">元信息...</div>
  </div>
</article>
```

- `.cn-post-card__cover`：高度 130px，`background:var(--cn-card-cover) center/cover`，无图时用 `var(--cn-card-grad)` 渐变，`overflow:hidden`，hover 微放大

- `.cn-post-card__cover::after`：渐变遮罩 `linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.6))`，确保白字可读

- `.cn-post-card__date`：白色小字，左上角

- `.cn-post-card__title a`：白色 20px，左下角，`text-shadow`

- `.cn-post-card__body`：白底/暗色底，padding 16-18px，摘要 + 元信息

### 3. CSS — 文章详情页 Hero Banner (`theme/cnblogs.css`)

新增 `.cn-article-hero` 样式块：

```css
.cn-article-hero {
  position:relative; width:100%; height:300px;
  margin:0 0 28px; border-radius:var(--cn-radius-lg);
  overflow:hidden;
  background:var(--cn-hero-cover,var(--cn-gradient)) center/cover;
}
.cn-article-hero::after {
  content:""; position:absolute; inset:0;
  background:linear-gradient(180deg,rgba(0,0,0,.20) 0%,rgba(0,0,0,.70) 100%);
}
.cn-article-hero__title {
  position:absolute; z-index:2; left:36px; right:36px; bottom:68px;
  color:#fff; font-size:30px; font-weight:800; line-height:1.35;
  text-shadow:0 2px 16px rgba(0,0,0,.5);
}
.cn-article-hero__quote {
  position:absolute; z-index:2; left:36px; right:36px; bottom:24px;
  color:rgba(255,255,255,.80); font-size:14px; font-style:italic;
  line-height:1.6; max-height:42px; overflow:hidden;
}
.cn-article-hero__quote::before { content:"❝ "; opacity:.5; }
.cn-article-hero__quote::after { content:" ❞"; opacity:.5; }
```

移动端：height 200px，title 22px，padding 20px。

### 4. JS — 封面图分配 + DOM 重组 + Hero 创建 (`theme/cnblogs.js`)

**A. 新增** **`getCoverUrl(title, bodyHTML)`** **函数**：

```
1. if CNB_COVER_MAP[title] → 返回该 URL
2. if bodyHTML 包含 <!--cover:url--> → 返回该 URL
3. if bodyHTML 包含 <img src="..."> → 返回首图 URL
4. if CNB_COVER_POOL 非空 → hash(title) % pool.length → 返回池中对应 URL
5. 返回 null → CSS 用渐变色兜底
```

**B. 新增** **`hashStr(s)`** **函数**：简单字符串 hash（标题 → 数字），用于稳定的池分配

**C. 新增渐变色板**：8 组色对，hash 取模选择，写入 `--cn-card-grad`

**D. 修改 DOM 重组逻辑**（178-208 行）：

- 创建 `.cn-post-card__cover` 包裹日期 + 标题

- 设置 `style.setProperty('--cn-card-cover', 'url(...)')`

- 无图时设置 `style.setProperty('--cn-card-grad', gradient)`

- 创建 `.cn-post-card__body` 包裹摘要 + 元信息

**E. 新增文章详情页 Hero Banner 逻辑**：

- 检测 `#post_detail` 存在

- 从 `.postTitle` 提取标题，从 `.postBody` 提取 HTML

- 调用 `getCoverUrl(title, bodyHTML)` 获取封面

- 创建 `.cn-article-hero` DOM，插入 `#post_detail` 最前面

- 从 `CNB_QUOTES` 随机选一句填入 `.cn-article-hero__quote`

- 隐藏原 `.postTitle`（标题已在 hero 中）

### 5. 具体文件修改清单

| 文件                  | 改动区域         | 说明                                                            |
| ------------------- | ------------ | ------------------------------------------------------------- |
| 博客园侧边栏公告            | 新增           | 贴入 `CNB_COVER_POOL` + `CNB_COVER_MAP` + `CNB_QUOTES` 的 script |
| `theme/cnblogs.css` | 250-320 行    | 重写 `.cn-post-card` 为 cover+body 结构                            |
| `theme/cnblogs.css` | 320 行后新增     | `.cn-article-hero` 详情页 Hero 样式                                |
| `theme/cnblogs.css` | 540-560 行响应式 | 适配 cover/hero 高度                                              |
| `theme/cnblogs.js`  | 178-208 行    | 重组逻辑改为 cover+body，调用 getCoverUrl                              |
| `theme/cnblogs.js`  | 新增函数         | `getCoverUrl()` + `hashStr()` + 渐变色板 + hero 创建                |
| `theme/config.js`   | 新增注释         | 说明封面/名言在侧边栏公告配置，不在 config.js                                  |
| `theme/footer.html` | 可能微调         | 确保 config.js → 侧边栏 → cnblogs.js 加载顺序                          |

### 6. 加载顺序保证

博客园页面上元素的加载顺序：

1. 页首 HTML（header）— 先加载
2. 页面正文 — 博客园渲染
3. **侧边栏公告** — 在正文之后、页脚之前渲染，`window.CNB_COVER_POOL` 等已定义
4. 页脚 HTML（footer）— 加载 config.js 和 cnblogs.js，此时侧边栏变量已可用

`cnblogs.js` 在 footer 中通过 `<script src>` 加载，执行时 `window.CNB_COVER_POOL` 已就绪。

## Assumptions & Decisions

1. **壁纸池管理**：在博客园侧边栏公告编辑，不碰 GitHub。上传图片到博客园文件系统，URL 贴入数组。
2. **自动分配**：标题 hash → 池取模，同一篇文章永远分配到同一张封面（确定性）。
3. **手动覆盖**：`CNB_COVER_MAP[标题] = URL`，在侧边栏直接加一行，即时生效。
4. **正文标记**：`<!--cover:url-->` 作为备选，写在文章开头。
5. **名言管理**：`CNB_QUOTES` 数组在侧边栏，随机选取。
6. **渐变色兜底**：8 组色对，池为空或图片加载失败时使用。
7. **暗色模式**：cover 遮罩加深，hero overlay 加深。
8. **首图自动提取**：从列表卡片可见的摘要 HTML 中提取，不从全文。

## Verification

1. 列表页：池中有图 → 每篇自动分配封面，标题白字覆盖
2. 列表页：`CNB_COVER_MAP` 有指定 → 用指定封面
3. 列表页：正文有 `<!--cover:-->` → 用标记封面
4. 列表页：池为空 → 渐变色 + 标题白字
5. 详情页：顶部 300px hero，同一封面放大 + 随机名言
6. 详情页：名言每次刷新可能不同（随机）
7. 暗色模式：遮罩加深，文字仍清晰
8. 移动端：cover 90px、hero 200px，标题不溢出
9. 新发文章不改任何代码 → 自动有封面

