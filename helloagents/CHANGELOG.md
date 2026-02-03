# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- cURL / fetch → Markdown：支持 Markdown 渲染预览（下载前检查排版）

### 变更
- Popup 菜单：支持通过 `popupVisibleToolIds` 配置展示模块，并与面板共用工具注册表避免不一致
- UI：Popup 与 tools 面板调整为「One API Hub」同款清爽风（白底 + 浅灰背景 + 蓝色强调 + 轻边框阴影）
- UI：切换为「柔和空气（Soft Air）」风格（slate-50 底色、圆角卡片、弱化分割线/阴影、导航高亮更克制）
- UI：提升全局默认行高，并增大 Popup/侧边栏导航的行高与内边距，缓解排版拥挤
- UI：tools.html 使用视口级布局（`h-screen` + `min-h-0`），并为多个工具页引入统一 `ToolHeader/ToolMain` 布局骨架
- UI：API 调试工具页重做为统一 ToolLayout 结构（顶部工具栏 + 请求/响应分栏 + Network Drawer），并统一 gray/blue 排版密度
- cURL → Markdown：示例代码默认不生成，可配置生成格式，并移动到文档末尾
- cURL → Markdown：支持输入响应内容；未提供响应则不输出“响应示例”；移除“字段说明”段落
- cURL → Markdown：生成的 Markdown 可编辑，复制/下载使用编辑后的内容
- cURL → Markdown：支持解析 DevTools「Copy as fetch」文本（fetch → Markdown）

## [1.3.0] - 2026-01-19

### 新增
- 初始化知识库：`helloagents/`（项目文档、模块说明、变更历史索引）
- 新增工具页：cURL → Markdown 文档生成（支持 Copy as cURL，预览/复制/下载）
- 新增依赖：`shellwords`（cURL 分词）、`@types/chrome`（TypeScript 类型支持）
