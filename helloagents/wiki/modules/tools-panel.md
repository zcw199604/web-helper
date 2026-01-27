# 工具面板（DevTools）

## 目的
提供 DevTools 面板容器：左侧导航、路由切换与统一布局，让各工具以页面形式集成。

## 模块概述
- **职责:** 组织工具菜单、路由与页面布局；承载各工具组件
- **状态:** ✅稳定
- **最后更新:** 2026-01-27

## 规范
- 新增工具页需：
  1) 在 `components/` 新增工具组件；
  2) 在 `entrypoints/tools.html/App.tsx` 增加 Route；
  3) 在 `utils/tool-modules.ts` 注册工具模块（面板菜单与 Popup 菜单共用）；
  4) 如需控制 Popup 菜单展示范围，在 `utils/ui-config.ts` 配置 `popupVisibleToolIds`；
  5) 工具逻辑尽量下沉到 `utils/`，避免组件过重。
- 工具页通用能力（复制/下载/错误提示）优先复用现有实现模式（如 `components/JsonFormatter.tsx`）。

## 关键文件
- `entrypoints/tools.html/App.tsx`
- `entrypoints/tools.html/main.tsx`
- `utils/devtools-init.ts`
- `utils/tool-modules.ts`
- `utils/ui-config.ts`
