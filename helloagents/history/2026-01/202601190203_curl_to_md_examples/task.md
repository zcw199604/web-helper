# 任务清单: cURL → Markdown 示例代码配置

目录: `helloagents/plan/202601190203_curl_to_md_examples/`
> 备注: 已迁移至 `helloagents/history/2026-01/202601190203_curl_to_md_examples/`，此处保留原始目录以便追溯

---

## 1. Markdown 生成调整
- [√] 1.1 在 `utils/markdown.ts` 中增加示例代码生成配置（默认不生成），并将示例代码移动到文档末尾

## 2. 工具页配置项
- [√] 2.1 在 `components/CurlToMarkdown.tsx` 中增加示例代码格式配置项（默认不生成），并联动 Markdown 输出

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/curl-to-md.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`

## 5. 测试
- [√] 5.1 运行 `npm run compile` 与 `npm run build`
