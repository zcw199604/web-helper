# cURL → Markdown

## 目的
将浏览器 DevTools Network 的「Copy as cURL」文本转换为 Markdown 接口文档（含请求信息、参数/头/Body、示例代码、响应与字段说明占位）。

## 模块概述
- **职责:** cURL 文本解析 → 结构化请求 → Markdown 生成 → 预览/复制/下载
- **状态:** ✅稳定
- **最后更新:** 2026-01-19

## 规范
- 仅解析文本，不执行任何命令或网络请求。
- 解析需兼容 DevTools「Copy as cURL」的常见复制样式：
  - Windows CMD：多行 + `^` 换行/引号转义
  - Bash：多行 + `\` 换行
- Markdown 输出固定包含：
  - 请求行（Method + URL）
  - Query 参数表、Headers 表
  - Body（JSON/表单/Raw）
- 可选输出：
  - 响应示例（当用户提供响应内容时生成；未提供则不输出）
  - 示例代码（cURL/fetch，可配置；默认不生成；位于文档末尾）
- 输出编辑：
  - 生成后的 Markdown 文本可在页面右侧直接编辑
  - “复制 Markdown / 下载 .md”均以编辑后的内容为准

## 关键文件
- `components/CurlToMarkdown.tsx`
- `utils/curl.ts`
- `utils/markdown.ts`
- `entrypoints/tools.html/App.tsx`

## 依赖
- `shellwords`：用于命令行分词（在解析前先对 Windows `^` 风格做归一化）
