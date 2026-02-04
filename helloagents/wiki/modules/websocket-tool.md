# WebSocket 调试

## 目的
在 DevTools 工具面板内快速连接 WebSocket 服务，发送/接收消息，用于调试实时接口。

## 模块概述
- **职责:** 连接管理（连接/断开、自动重连、心跳）、消息发送（Text/JSON/Binary）、消息日志（IN/OUT/SYSTEM、搜索/过滤、复制/清空）、页面上下文连接（实验）
- **状态:** ✅稳定（页面上下文：实验）
- **最后更新:** 2026-02-04

## 规范
- URL 以浏览器 `WebSocket` API 为准（通常为 `ws://` / `wss://`）。
- JSON 模式：仅做语法校验；发送内容保持原文（不改写），展示可切换美化/原文。
- Binary 模式：支持 Base64 / Hex 输入；展示支持 Hex / Base64 / UTF-8。
- 自动重连：仅在非手动断开时触发；最大次数为 0 表示无限。
- 心跳：应用层定时发送文本 payload（默认不写入日志）。
- 页面上下文（实验）：仅 DevTools 面板可用；通过 `chrome.devtools.inspectedWindow.eval` 在被调试页面内创建 WebSocket，并通过轮询拉取事件。
- 限制：浏览器 WebSocket API 基本无法自定义握手 Headers；若服务端依赖 Header 鉴权，需要改用 Cookie/Query/子协议等方式（视后端实现而定）。
- 工具页卸载时需自动关闭连接，避免残留连接影响后续调试。

## 关键文件
- `components/WebSocketTool.tsx`
- `utils/ws-codec.ts`
- `utils/ws-page-bridge.ts`
- `entrypoints/tools.html/App.tsx`
- `utils/tool-modules.ts`
