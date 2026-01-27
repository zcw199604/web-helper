# 扩展弹窗（Popup）

## 目的
提供浏览器扩展 Popup 的快捷入口菜单，用于快速打开 DevTools 面板中的对应工具页面。

## 模块概述
- **职责:** 展示工具快捷菜单；点击后打开 `tools.html` 并跳转到指定工具路由
- **状态:** ✅稳定
- **最后更新:** 2026-01-27

## 配置

### Popup 菜单展示白名单
在 `utils/ui-config.ts` 中通过 `popupVisibleToolIds` 控制 Popup 中展示的工具模块：
- `undefined`：未配置时默认展示全部（与面板一致）
- `ToolId[]`：白名单，只展示指定模块（顺序按数组定义）

## 关键文件
- `entrypoints/popup/App.tsx`
- `entrypoints/popup/main.tsx`
- `utils/tool-modules.ts`
- `utils/ui-config.ts`

