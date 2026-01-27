# 技术设计: cURL / fetch → Markdown 预览渲染

## 技术方案
### 核心技术
- React
- `react-markdown`: Markdown → React 组件渲染
- `remark-gfm`: 支持 GFM（表格、任务列表、删除线等）
- Tailwind CSS（现有）用于预览样式

### 实现要点
- UI:
  - 在 `components/CurlToMarkdown.tsx` 增加 `viewMode: 'code' | 'preview'` 状态
  - 输出区加入切换按钮（参考 `components/JsonFormatter.tsx` 的视图切换交互）
  - `viewMode === 'code'`: 保持 textarea 编辑
  - `viewMode === 'preview'`: 使用 `MarkdownPreview` 渲染 `markdown` 字符串，容器 `overflow-auto` 并保留 `custom-scrollbar`
- 渲染:
  - 新增 `components/ui/MarkdownPreview.tsx`，封装 `react-markdown` + `remark-gfm`
  - 不启用 `rehype-raw`，不渲染原始 HTML，降低 XSS 风险
  - 通过 `components` 映射为标题、列表、表格、代码块提供 Tailwind 样式（无需引入 typography 插件）
- 行为:
  - 预览不改变 `markdown` 内容；复制/下载使用 `markdown` 原始文本（与现有保持一致）
  - `markdown` 为空时，预览显示占位提示

## 架构决策 ADR

### ADR-001: 采用 `react-markdown` + `remark-gfm` 实现 Markdown 预览
**上下文:** 需要在扩展工具页中预览 Markdown 渲染效果，且输出内容来自用户可编辑文本，必须避免 XSS 风险。
**决策:** 使用 `react-markdown` 渲染 Markdown AST，并配合 `remark-gfm` 支持表格等 GFM 语法；不启用 `rehype-raw`。
**理由:** 默认不渲染 HTML，安全边界清晰；React 组件渲染易于样式控制；生态成熟。
**替代方案:** `marked` + `DOMPurify` → 拒绝原因: 需要维护净化配置，风险与治理成本更高。
**影响:** 增加运行时依赖与构建体积；预览样式需要维护组件映射。

## API设计
无

## 数据模型
无

## 安全与性能
- **安全:** 不渲染原始 HTML；仅显示渲染结果，不执行网络请求；保持现有“仅解析文本”的原则。
- **性能:** 预览在前端渲染，Markdown 过大时可能影响性能；通过容器滚动与尽量轻量样式降低开销。

## 测试与部署
- **测试:** 手动回归：生成包含表格/代码块/列表的 Markdown，切换预览检查渲染；验证复制/下载内容与编辑区一致。
- **部署:** 本地 `npm run dev` 验证后按现有 `wxt build` 流程构建。
