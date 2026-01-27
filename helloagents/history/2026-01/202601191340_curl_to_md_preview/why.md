# 变更提案: cURL / fetch → Markdown 预览渲染

## 需求背景
当前工具页右侧仅提供 Markdown 纯文本编辑区，用户在下载 .md 前无法确认渲染后的排版是否正确（尤其是表格、代码块、引用等）。需要提供一个“预览”能力，帮助在导出前发现格式问题并及时修正。

## 变更内容
1. 在输出区增加“编辑/预览”切换按钮，预览模式下渲染当前 Markdown。
2. 预览支持常用 Markdown 与 GFM 扩展（表格、任务列表、删除线等）。
3. 下载/复制仍以编辑区内容为准，保证用户可在预览前后自由修改文本。

## 影响范围
- **模块:** cURL / fetch → Markdown
- **文件:**
  - `components/CurlToMarkdown.tsx`
  - `components/ui/MarkdownPreview.tsx`（新增）
  - `package.json` / `package-lock.json`
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: Markdown 预览
**模块:** cURL / fetch → Markdown
在下载 .md 之前，用户可以看到 Markdown 渲染结果并检查排版。

#### 场景: 下载前预览
用户已生成或编辑了右侧 Markdown 文本。
- 点击“预览”后展示渲染结果（含表格/代码块/列表等）。
- 切回“编辑”可继续修改，预览随文本变化更新。
- 下载 .md 仍以当前编辑内容生成。

## 风险评估
- **风险:** 新增依赖带来包体与构建变更；Markdown 渲染潜在 XSS 风险（若允许 HTML）。
- **缓解:** 选用 `react-markdown` 默认安全策略（不启用 `rehype-raw`），仅渲染 Markdown AST；预览区限制样式与滚动，避免性能问题。
