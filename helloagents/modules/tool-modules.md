# tool-modules

## 职责

提供“工具模块注册表”的单一事实来源，并提供基于白名单的过滤函数，供面板菜单与 Popup 菜单复用。

当前注册工具包含：
- json
- excel-converter
- encoding
- cron
- jwt
- api-tester
- websocket
- curl-to-md

## 接口定义

### 公共API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `resolveToolModulesByIds` | `visibleIds?: readonly string[]` | `ToolModule[]` | 根据白名单过滤并保持顺序；未配置时返回全部 |

## 行为规范

### Popup 白名单过滤
**条件**: `utils/ui-config.ts` 配置 `popupVisibleToolIds`
**行为**: 按白名单顺序输出工具模块；未知 id 忽略
**结果**: Popup 菜单可控且不影响面板菜单

### 工具菜单统一注册
**条件**: 新增工具页（如 excel-converter）
**行为**: 在 `TOOL_MODULES` 注册后，侧栏与 Popup 菜单自动复用
**结果**: 避免多处手工维护造成菜单不一致

## 依赖关系

```yaml
依赖: []
被依赖:
  - popup
  - tools-panel
```
