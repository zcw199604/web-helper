# API 调试

## 目的
在 DevTools 面板内构建并发送 HTTP 请求，支持从 DevTools Network 捕获/填充请求（HAR entry）。

## 模块概述
- **职责:** 请求构建（URL/Headers/Body）、发送与响应展示；对接 DevTools Network
- **状态:** ✅稳定
- **最后更新:** 2026-01-19

## 规范
- HAR 填充逻辑以 `populateFromHar(entry)` 为入口，保持对常见 Content-Type 的兼容。
- DevTools Network 监听仅在 DevTools 面板上下文生效，需做好环境判断与降级。

## 关键文件
- `components/ApiTester.tsx`

