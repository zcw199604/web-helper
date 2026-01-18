# API 手册

## 概述
本项目主要为本地 DevTools 工具箱扩展，不提供对外 HTTP API。本文件记录扩展内部可用的消息协议与关键交互点，供工具模块复用与维护。

## 内部消息（Chrome Runtime）

| type | 用途 | payload |
|------|------|---------|
| `FILL_API_TESTER_REQUEST` | 向 API 调试工具填充一次请求 | DevTools Network 的 HAR-like entry（`request`/`response` 等） |

> 说明：具体结构以 `components/ApiTester.tsx` 的 `populateFromHar(entry)` 逻辑为准。

