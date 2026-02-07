# 编码转换

## 目的
提供常用编码/解码、哈希、解析与压缩工具，覆盖开发调试中的高频文本转换场景。

## 模块概述
- **职责:** 统一的编码工具注册表与交互页面（21 项能力）
- **状态:** ✅稳定
- **最后更新:** 2026-02-07

## 规范
- 操作配置集中维护在 `utils/encoding-toolkit.ts` 的 `ENCODING_OPERATIONS`。
- Gzip 统一约定：压缩输出 Base64，解压输入 Base64（输入建议 ≤ 1MB）。
- UTF16(`\\x`)按字节十六进制转义解释（`\\xHH`），并保持错误提示一致。
- 复制仍使用 `navigator.clipboard.writeText()`，需由用户操作触发。

## 关键文件
- `components/EncodingTools.tsx`
- `utils/encoding-toolkit.ts`
- `tests/encoding-tools.test.js`
- `utils/tool-modules.ts`
