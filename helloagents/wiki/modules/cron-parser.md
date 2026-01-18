# Cron 表达式

## 目的
解析 Cron 表达式并展示下一次执行时间与人类可读描述。

## 模块概述
- **职责:** Cron 表达式解析、计算与展示
- **状态:** ✅稳定
- **最后更新:** 2026-01-19

## 规范
- Cron 解析逻辑集中于 `utils/cron.ts`，UI 组件只负责输入/展示。

## 关键文件
- `components/CronParser.tsx`
- `utils/cron.ts`

