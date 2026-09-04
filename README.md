# CNB Notes — 博客园主题

一个为 [博客园](https://www.cnblogs.com) 打造的轻量自定义主题，用纯 CSS + JS 实现现代化的阅读体验。无需 Node.js、无需构建工具、无需额外服务器——直接粘贴到博客园后台即可生效。

## 特性

- **浅色 / 深色主题**：手动切换，首次访问跟随系统偏好，选择存 `localStorage`。
- **磨砂玻璃风格**：半透明卡片 + 背景模糊，支持自定义壁纸 URL。
- **代码一键复制**：每个代码块右上角出现「复制」按钮，复制后短暂回显「已复制」。
- **图片灯箱预览**：点击文章内图片弹出全屏遮罩查看大图，点击关闭。
- **阅读进度条**：顶部固定进度条，实时反映阅读位置。
- **回到顶部**：滚动超过一屏后右下角出现按钮，平滑回顶。
- **文章目录（TOC）**：宽屏下左侧浮动目录，自动高亮当前章节，点击平滑跳转。
- **响应式布局**：宽屏双栏（内容 + 侧边栏），窄屏自动折叠为单列。
- **零依赖**：不依赖 jQuery 或任何框架，原生 JS，禁用 JS 后文章仍可正常阅读。

## 文件结构

```
cnblog/
├── README.md              项目说明
├── .gitignore
├── docs/
│   └── install.md         博客园安装指南
└── theme/
    ├── config.js          主题配置（博客名、壁纸、导航、开关）
    ├── cnblogs.css         主题样式（粘贴到「CSS 代码」）
    ├── cnblogs.js          主题逻辑（复制代码、灯箱、目录等）
    ├── header.html         页首 HTML（导航栏 + 进度条）
    └── footer.html         页脚 HTML（回到顶部 + 目录容器）
```

## 快速开始

1. 编辑 `theme/config.js`，填写你的博客名、壁纸和导航链接。
2. 按 [安装指南](docs/install.md) 将各文件粘贴到博客园后台对应位置。
3. 刷新博客首页验证效果。

## 配置项

`theme/config.js` 中的 `CNB_THEME_CONFIG` 对象：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `blogName` | string | 导航栏显示的博客名称 |
| `subtitle` | string | 副标题（预留） |
| `wallpaper` | string | 壁纸图片 URL（HTTPS，留空为纯色背景） |
| `avatar` | string | 头像 URL（预留） |
| `links` | array | 导航链接，每项 `{ text, href }` |
| `homePostsPerPage` | number | 首页每页文章数；主题会基于博客园原生分页连续重组文章 |
| `showToc` | bool | 是否显示文章目录（默认 true） |
| `showReadingProgress` | bool | 是否显示阅读进度条（默认 true） |
| `codeCopy` | bool | 是否启用代码复制按钮（默认 true） |
| `imagePreview` | bool | 是否启用图片灯箱（默认 true） |

## 技术说明

- 主题通过博客园后台的「CSS 代码」「页首 HTML」「页脚 HTML」三个入口注入。
- JS 文件建议通过 CDN 引用（如 jsDelivr），也可直接内联到页脚 HTML。
- 有意不隐藏博客园原生文章和评论内容；JS 被禁用时文章仍可正常阅读。
- 博客园可能调整 DOM 结构；若样式失效，优先检查 `#home`、`#mainContent`、`.postBody`、`#post_detail` 是否仍存在。

## License

MIT
