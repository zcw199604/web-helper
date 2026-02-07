# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- **[excel-converter]**: 新增 Excel 转换工具，默认支持粘贴表格文本（TSV/CSV），可选导入 .xlsx/.xls，支持导出 JSON / INSERT SQL / XML
  - 方案: [202602071028_excel-converter-json-sql-xml](archive/2026-02/202602071028_excel-converter-json-sql-xml/)
  - 决策: excel-converter-json-sql-xml#D001(xlsx解析), excel-converter-json-sql-xml#D003(粘贴优先), excel-converter-json-sql-xml#D004(SQL方言适配)
- **[encoding-tools]**: 编码转换工具扩展 21 项能力（Unicode/URL/UTF16(\x)/Base64/Hex/HTML/Gzip、MD5/SHA1、URL参数解析、JWT解码、Cookie格式化）
  - 方案: [202602070507_encoding-encrypt-decrypt-tools](archive/2026-02/202602070507_encoding-encrypt-decrypt-tools/)
  - 决策: encoding-encrypt-decrypt-tools#D001(操作注册表驱动), encoding-encrypt-decrypt-tools#D002(crypto-js + pako)
- cURL / fetch → Markdown：支持 Markdown 渲染预览（下载前检查排版）
- WebSocket 调试：新增工具页（扩展面板/页面上下文连接、Text/JSON/Binary、日志搜索/过滤、自动重连、心跳）

### 变更
- Popup 菜单：支持通过 `popupVisibleToolIds` 配置展示模块，并与面板共用工具注册表避免不一致
- UI：Popup 与 tools 面板调整为「One API Hub」同款清爽风（白底 + 浅灰背景 + 蓝色强调 + 轻边框阴影）
- UI：tools.html 改为全宽 + 窄屏紧凑布局：左侧导航默认折叠为图标栏，收紧外边距/间距与 ToolHeader 内边距，扩大主内容可用空间
- UI：切换为「柔和空气（Soft Air）」风格（slate-50 底色、圆角卡片、弱化分割线/阴影、导航高亮更克制）
- UI：提升全局默认行高，并增大 Popup/侧边栏导航的行高与内边距，缓解排版拥挤
- UI：tools.html 使用视口级布局（`h-screen` + `min-h-0`），并为多个工具页引入统一 `ToolHeader/ToolMain` 布局骨架
- UI：API 调试工具页重做为统一 ToolLayout 结构（顶部工具栏 + 请求/响应分栏 + Network Drawer），并统一 gray/blue 排版密度
- JSON 格式化：主编辑区支持响应式分栏（窄屏上下分栏，超宽屏左右分栏）
- JSON 格式化：Tree 交互性能优化（虚拟列表 `@tanstack/react-virtual`，降低展开/滚动卡顿；子节点默认分页大小下调）
- JSON 格式化：新增全量搜索（key/value），用于在 Tree 虚拟渲染下替代浏览器 Ctrl+F
- JSON 格式化：优化大 JSON 交互性能（Web Worker 解析/格式化/JSONPath、自动修复常见非严格 JSON：尾逗号/非法转义、Tree 支持一键全部展开（默认关闭）、子节点分页渲染）
- cURL → Markdown：示例代码默认不生成，可配置生成格式，并移动到文档末尾
- cURL → Markdown：支持输入响应内容；未提供响应则不输出“响应示例”；移除“字段说明”段落
- cURL → Markdown：生成的 Markdown 可编辑，复制/下载使用编辑后的内容
- cURL → Markdown：支持解析 DevTools「Copy as fetch」文本（fetch → Markdown）
- cURL / fetch → Markdown：新增 Header 自动清理（可开关）与手动勾选删除
- cURL / fetch → Markdown：修复空输入/解析失败时手动删除状态重置引发的重复渲染
- cURL / fetch → Markdown：优化解析链路（Header 勾选不再重复解析输入），并调整删除统计口径避免重复计数歧义

## [1.3.0] - 2026-01-19

### 新增
- **[encoding-tools]**: 编码转换工具扩展 21 项能力（Unicode/URL/UTF16(\x)/Base64/Hex/HTML/Gzip、MD5/SHA1、URL参数解析、JWT解码、Cookie格式化）
  - 方案: [202602070507_encoding-encrypt-decrypt-tools](archive/2026-02/202602070507_encoding-encrypt-decrypt-tools/)
  - 决策: encoding-encrypt-decrypt-tools#D001(操作注册表驱动), encoding-encrypt-decrypt-tools#D002(crypto-js + pako)
- 初始化知识库：`helloagents/`（项目文档、模块说明、变更历史索引）
- 新增工具页：cURL → Markdown 文档生成（支持 Copy as cURL，预览/复制/下载）
- 新增依赖：`shellwords`（cURL 分词）、`@types/chrome`（TypeScript 类型支持）
