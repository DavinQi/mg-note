# mg-node 可交互 HTML 原型

纯 HTML、CSS 和原生 JS，**不依赖任何外部网络**，双击 `index.html` 就能离线打开（推荐 Chrome 或 Safari）。

## 目录
| 文件 | 说明 |
|---|---|
| index.html | 原型目录（14 个页面的缩略图入口，带暗色模式开关） |
| login.html → repo-select.html → main.html | 登录 → 选择仓库 → 主界面 的完整流程 |
| md-editor.html | Markdown 编辑器：⌘1/⌘2/⌘3 切换模式，工具栏插入，`/` 插入菜单（`?mode=edit` 可以指定初始模式） |
| doc-viewer.html | PPTX/PDF/DOCX 只读预览与批注（高亮、便签、画笔，缩放） |
| publish.html | 公开发布：检查结果、确认、开关切换 |
| extension.html | 浏览器插件弹窗 |
| avatar.html | 头像选择器（选择结果存在 localStorage，所有页面同步更新） |
| ai-settings.html / ai-chat.html / ai-summary.html | AI 知识库：设置（默认关闭）/ 带引用的问答 / 总结（都是假数据） |
| smart-hints.html | 命令面板、斜杠菜单、意图动作（Alt+↵） |
| quit-sync.html | ⌘Q 退出时自动同步 |
| new.html | 新建：⌘N 菜单；新建文件夹（上级分类下拉，最多两级，创建后节点出现在侧栏树里）；新建文件（选择类型和模板、两级级联选择位置、公开开关，创建后打开对应的编辑器：MD/HTML/TXT 进入编辑器，DOCX/PPTX 进入只读预览）。`?open=folder\|file` 可以直接打开对应对话框；分类树存在 localStorage 的 `mg.tree` |
| import.html | 本地导入：添加文件或文件夹、重名策略、假进度、取消、结果报告 |
| tokens.css | 设计 token（`--c-*` 颜色、`--r-*` 圆角、`--s-*` 间距、`--f-*`/`--fs-*` 字体、`--shadow-*` 阴影）；`[data-theme=dark]` 下覆盖为暗色 |
| components.css | 通用组件 |
| app.css | 页面布局：窗口外壳、侧栏、列表、编辑区、AI 面板 |
| app.js | 公共交互，对外暴露 `window.MG` |
| assets/ | 插画、头像、目录缩略图 |

## 组件类名（BEM 风格，状态统一用 `is-*`）
- 按钮：`.btn`，变体 `.btn--primary` `.btn--brand` `.btn--warn` `.btn--ghost` `.btn--sm`
- 分段控件：`.seg > .seg__item(.is-active)`，`.seg--block` 撑满宽度；点击时触发 `seg` 自定义事件（`detail` = `data-v` 或文本）
- 卡片：`.card`，可选卡片 `.card--select.is-active`
- 工具栏：`.toolbar > .toolbar__group > .toolbar__row > .toolbar__btn`，分组标题 `.toolbar__label`
- 弹窗：`.modal-mask(.is-open) > .modal`，包含 `.modal__title` 和 `.modal__foot`；顶部下拉面板 `.sheet(.is-open)`
- Toast：`MG.toast('文字')`（`.toast.is-show`）
- 菜单：`.menu(.is-open) > .menu__item(.is-active)`、`.menu__hint`、`.menu__item--danger`
- 标签页：`.tabs > .tabs__item.is-active`
- 徽章：`.badge`，变体 `.badge--public` `.badge--warn` `.badge--danger`；可点击标签用 `.chip`（`.chip--off` / `.is-active`）
- 开关：`.switch(.is-on)`，点击时触发 `toggle` 事件
- 其他：`.field` 输入框、`.label`、`.muted`、`.progress > .progress__bar`、`.avatar`、`.tip[data-tip]` 悬停提示、`kbd`

## 页面写法
页面放一个 `<div data-shell>`，app.js 会生成 Mac 窗口外壳；`data-shell="nolist"` 不显示笔记列表。`<template id="tpl">` 里的内容会放进主区域。页面逻辑写在 `window.page = MG => {...}`，`MG.editor(el, {mode})` 用来挂载 Markdown 编辑器。

## 全局快捷键（Windows/Linux 上用 Ctrl）
⌘N 新建菜单 · ⌘⇧N 新建文件夹 · ⌘⇧P 命令面板 · ⌘1/2/3 切换模式 · ⌘J AI 面板 · ⌘I 导入 · ⌘Q 退出同步 · 编辑区输入 `/` 打开插入菜单

> 所有 AI 回答、同步和导入都是前端模拟，不发出任何请求，也不包含任何 API Key。

## 个性化设置（同步自 git-note-tool-design）
- 页面：`login.html` 右上角「个性化」（含插画）；`customize.html` / `avatar.html`，或主界面侧栏底部的个人卡片。
- 保存在 `localStorage['mg-note-settings']`，所有页面共用：`accent`（6 种）、`appearance`（classic/paper/mist）、`handFont`、`avatar`（10 个 SVG）、`avatarShape`（circle/squircle/blob）、`nickname`（不超过 12 字）、`loginArt`（anime/cat/plants）。
- 实现：`MG.applyTheme()` 写入 `--accent-50…900`、`--av-radius`、`data-appearance`、`data-hand`；`MG.getS()` / `MG.updateS(patch)` 读写设置。
- 恢复默认：在控制台执行 `localStorage.removeItem('mg-note-settings')`。

- 左下角个人卡片：一级菜单（个性化 › / 切换仓库 / AI 设置 / 暗色 / 退出），「个性化 ›」悬停或点击打开右侧二级浮层；键盘 ↑↓ Enter → ← Esc。`customize.html?sec=av|acc|app|font` 直接打开对应分区，`?menu` 只显示一级菜单。

- 登录页插画自定义：上传 JPG/PNG/WebP（≤5 MB，最多 8 张，自动裁成 0.92:1），拖动排序、编辑手写标语、删除/恢复预设，轮播 自动(5–30 秒，顺序/随机)/关闭/固定。图片存在 `localStorage['mg-note-login-art:<id>']`，设置项 `loginArts`/`carousel`/`interval`/`artOrder` 存在 `mg-note-settings`。
