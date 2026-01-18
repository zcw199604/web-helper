# 任务清单: cURL → Markdown 支持 fetch 解析（轻量迭代）

目录: `helloagents/plan/202601190245_curl_to_md_fetch/`
> 备注: 已迁移至 `helloagents/history/2026-01/202601190245_curl_to_md_fetch/`，此处保留原始目录以便追溯

---

## 1. fetch 解析器
- [√] 1.1 新增 `utils/fetch.ts`：解析 DevTools「Copy as fetch」文本，提取 method/url/headers/body/query

## 2. 统一解析入口与工具页联动
- [√] 2.1 新增 `utils/request.ts`：在 cURL / fetch 之间自动识别并解析
- [√] 2.2 更新 `components/CurlToMarkdown.tsx`：输入支持 cURL / fetch；Markdown 输出保留对应“原始输入（DevTools）”

## 3. Markdown 输出增强
- [√] 3.1 更新 `utils/markdown.ts`：支持输出“原始 fetch（DevTools）”段落

## 4. 文档与变更记录
- [√] 4.1 更新 `helloagents/wiki/modules/curl-to-md.md`
- [√] 4.2 更新 `helloagents/wiki/overview.md`
- [√] 4.3 更新 `helloagents/CHANGELOG.md`
- [√] 4.4 更新 `helloagents/history/index.md`

## 5. 安全检查
- [√] 5.1 执行安全检查（按G9: 仅文本解析、不执行命令/请求、避免敏感信息写入）

## 6. 测试
- [√] 6.1 运行 `npm run compile`

