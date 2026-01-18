# 任务清单: cURL → Markdown 文档生成

目录: `helloagents/plan/202601190137_curl_to_md/`
> 备注: 已迁移至 `helloagents/history/2026-01/202601190137_curl_to_md/`，此处保留原始目录以便追溯

---

## 1. cURL → Markdown 工具页
- [√] 1.1 在 `entrypoints/tools.html/App.tsx` 中新增导航与路由入口（独立工具页），验证 why.md#需求-curl-to-md-场景-paste-curl
- [√] 1.2 在 `components/CurlToMarkdown.tsx` 中实现输入/输出双栏 UI、错误提示、预览区，验证 why.md#需求-curl-to-md-场景-paste-curl，依赖任务1.1
- [√] 1.3 在 `components/CurlToMarkdown.tsx` 中实现“一键复制/下载 .md”，验证 why.md#需求-curl-to-md-场景-copy-md 与 why.md#需求-curl-to-md-场景-download-md，依赖任务1.2

## 2. 解析与 Markdown 生成
- [√] 2.1 在 `utils/curl.ts` 中实现 cURL 归一化与解析（依赖 `shellwords`），支持 Windows `^` 多行风格，验证 why.md#需求-curl-to-md-场景-paste-curl
- [√] 2.2 在 `utils/markdown.ts` 中实现 Markdown 文档生成（含请求/参数/头/Body/示例/占位），验证 why.md#需求-curl-to-md-场景-paste-curl，依赖任务2.1
- [√] 2.3 在 `components/CurlToMarkdown.tsx` 中集成解析与生成逻辑，完成端到端体验，依赖任务2.2

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/curl-to-md.md`（从“规划中”更新为实现细节）
- [√] 4.2 更新 `helloagents/CHANGELOG.md` 记录新增工具页与依赖变更

## 5. 测试
- [√] 5.1 运行 `npm run compile`（类型检查）与 `npm run build`（构建）验证无错误
