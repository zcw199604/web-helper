# JWT 解码

## 目的
解析 JWT 并展示 Header/Payload 信息，辅助排查与验证。

## 模块概述
- **职责:** JWT 解析与展示
- **状态:** ✅稳定
- **最后更新:** 2026-01-19

## 规范
- JWT 解析使用 `utils/jwt.ts`（封装第三方库），避免在组件中散落解析逻辑。

## 关键文件
- `components/JwtDecoder.tsx`
- `utils/jwt.ts`

