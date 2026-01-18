# 编码转换

## 目的
提供常用编码/解码工具（Base64、URL 编解码等）以及 URL 参数解析。

## 模块概述
- **职责:** 文本/URL 编码工具与参数解析展示
- **状态:** ✅稳定
- **最后更新:** 2026-01-19

## 规范
- URL 参数解析与构建统一使用 `utils/url.ts`。
- 复制使用 `navigator.clipboard.writeText()`，读取剪贴板如引入需确保用户手势触发。

## 关键文件
- `components/EncodingTools.tsx`
- `utils/base64.ts`
- `utils/url.ts`

