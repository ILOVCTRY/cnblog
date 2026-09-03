# 博客园安装指南

本主题使用博客园原生文章、分类、标签、归档和评论。不需要 Node.js、构建工具或额外服务器。

## 1. 修改配置

编辑 `theme/config.js`，至少填写 `blogName`；可选填写壁纸 URL、导航链接及交互开关。

该文件必须在 `cnblogs.js` 之前加载。

## 2. 粘贴到博客园

打开博客园后台的 **设置**，找到以下四个区域：

### 2.1 CSS 代码

将 `theme/cnblogs.css` 的全部内容粘贴进去。

### 2.2 页首 HTML 代码

将 `theme/header.html` 的全部内容粘贴进去。

### 2.3 页脚 HTML 代码

将 `theme/footer.html` 的全部内容粘贴进去。

### 2.4 加载 JS 脚本

在页脚 HTML 内容的**末尾**追加两个 `<script>` 标签，先加载配置再加载主题逻辑。

**方式一：CDN 引用（推荐）**

通过 jsDelivr CDN 加载，自动跟随仓库更新：

```html
<script src="https://cdn.jsdelivr.net/gh/ILOVCTRY/cnblog@main/theme/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/ILOVCTRY/cnblog@main/theme/cnblogs.js"></script>
```

**方式二：GitHub raw 直链**

```html
<script src="https://raw.githubusercontent.com/ILOVCTRY/cnblog/main/theme/config.js"></script>
<script src="https://raw.githubusercontent.com/ILOVCTRY/cnblog/main/theme/cnblogs.js"></script>
```

> 注意：部分浏览器对 `raw.githubusercontent.com` 的 MIME 类型限制可能导致脚本被阻止，优先推荐使用方式一。

**方式三：内联**

将 `config.js` 和 `cnblogs.js` 的内容分别包进 `<script>` 标签，直接粘贴到页脚 HTML 末尾：

```html
<script>
  // config.js 内容
</script>
<script>
  // cnblogs.js 内容
</script>
```

## 3. 验收清单

| 页面 | 检查项 |
| --- | --- |
| 首页 | 导航栏显示博客名、磨砂背景、卡片样式、侧边栏 |
| 文章详情 | 阅读进度条、代码复制按钮、图片灯箱、回到顶部、左侧目录（宽屏） |
| 归档/标签页 | 页面布局正常、无溢出 |
| 手机页面 | 单列布局、导航可横向滚动、目录隐藏 |
| 评论区 | 博客园原生评论正常、文本框样式适配 |

## 注意事项

- **壁纸**必须为 HTTPS 且允许跨域访问的图片 URL，否则不会显示。
- **首次访问**的明暗模式跟随系统偏好（`prefers-color-scheme`），之后按用户手动选择。
- 主题有意不隐藏文章和评论的原始内容；JS 被禁用时文章仍可正常阅读。
- 博客园可能调整 DOM 结构。若样式失效，优先检查 `#home`、`#mainContent`、`.postBody`、`#post_detail` 是否仍存在，再更新 CSS/JS 中的选择器。
