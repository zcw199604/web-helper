# 任务清单: cURL / fetch → Markdown 预览渲染

目录: `helloagents/plan/202601191340_curl_to_md_preview/`
> 备注: 已迁移至 `helloagents/history/2026-01/202601191340_curl_to_md_preview/`，此处保留原始目录以便追溯

---

## 1. Markdown 预览渲染
- [√] 1.1 在 `package.json` 中引入 `react-markdown` 与 `remark-gfm` 依赖，并更新 lockfile，验证 why.md#场景-下载前预览
  > 备注: `npm install` 提示 2 个漏洞（1 moderate, 1 high），本次未执行 `npm audit fix`
- [√] 1.2 新增 `components/ui/MarkdownPreview.tsx`，封装 Markdown 渲染与基础样式（支持表格/代码块/列表），验证 why.md#场景-下载前预览，依赖任务1.1
- [√] 1.3 更新 `components/CurlToMarkdown.tsx`：增加“编辑/预览”切换按钮与预览视图，下载/复制仍以编辑文本为准，验证 why.md#场景-下载前预览，依赖任务1.2

## 2. 安全检查
- [√] 2.1 确认预览不启用原始 HTML 渲染（无 `rehype-raw`），并检查所有用户输入仅作为文本处理，不引入新的网络请求，按G9完成安全检查

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/curl-to-md.md`：补充预览能力与安全约束说明
- [√] 3.2 更新 `helloagents/CHANGELOG.md`：记录新增“Markdown 预览”功能

## 4. 质量验证
- [√] 4.1 执行 `npm run compile` 通过 TypeScript 检查
- [?] 4.2 手动验证：表格/代码块/列表/引用渲染正确；切换预览不丢失编辑内容；下载文件内容与编辑区一致
  > 备注: 需要在浏览器扩展工具页手动验证

## 5. 方案包迁移
- [√] 5.1 开发实施完成后，将方案包迁移至 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`（按G11）
