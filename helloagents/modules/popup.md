# popup

## 职责

提供浏览器扩展 Popup 的快捷入口菜单，用于快速打开 DevTools 面板中的对应工具页面。

## 行为规范

### Popup 菜单展示与跳转
**条件**: 用户打开扩展 Popup
**行为**: Popup 根据 `utils/ui-config.ts` 的 `popupVisibleToolIds` 过滤 `utils/tool-modules.ts` 的注册表并渲染菜单；点击菜单项打开 `tools.html#/{toolId}`
**结果**: 打开对应工具路由页面；未配置时默认展示全部（与面板一致）

## 依赖关系

```yaml
依赖:
  - tool-modules
被依赖: []
```

