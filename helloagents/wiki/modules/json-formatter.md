# JSON 格式化

## 目的
提供 JSON 的格式化、压缩、校验与查询（JSONPath）能力。

## 模块概述
- **职责:** JSON 文本处理与可视化展示
- **状态:** ✅稳定
- **最后更新:** 2026-01-19

## 规范
- JSON 处理逻辑集中在 `utils/json.ts`，组件只负责交互与展示。
- 复制与下载遵循浏览器 Blob 下载模式（见组件实现）。

## 关键文件
- `components/JsonFormatter.tsx`
- `utils/json.ts`

