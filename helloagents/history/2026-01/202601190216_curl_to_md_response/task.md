# 任务清单: cURL → Markdown 响应输入与条件输出

目录: `helloagents/plan/202601190216_curl_to_md_response/`
> 备注: 已迁移至 `helloagents/history/2026-01/202601190216_curl_to_md_response/`，此处保留原始目录以便追溯

---

## 1. 工具页输入增强
- [√] 1.1 在 `components/CurlToMarkdown.tsx` 左侧增加“响应内容”输入框，并将其纳入 Markdown 生成

## 2. Markdown 生成逻辑
- [√] 2.1 在 `utils/markdown.ts` 支持传入响应内容；未提供响应时不输出“响应示例/字段说明”

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/curl-to-md.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`

## 5. 测试
- [√] 5.1 运行 `npm run compile` 与 `npm run build`
