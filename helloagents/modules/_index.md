# 模块索引

> 通过此文件快速定位模块文档

## 模块清单

| 模块 | 职责 | 状态 | 文档 |
|------|------|------|------|
| popup | Popup 快捷菜单与跳转 | ✅ | [popup.md](./popup.md) |
| tools-panel | DevTools 面板容器（导航 + 路由） | ✅ | [tools-panel.md](./tools-panel.md) |
| tool-modules | 工具模块注册表与过滤逻辑 | ✅ | [tool-modules.md](./tool-modules.md) |
| json-cleaner | JSON 字段清理与策略持久化 | ✅ | [json-cleaner.md](./json-cleaner.md) |
| encoding-tools | 编码转换工具页与编码工具函数 | ✅ | [encoding-tools.md](./encoding-tools.md) |
| excel-converter | Excel/粘贴表格转换（JSON / SQL / XML） | ✅ | [excel-converter.md](./excel-converter.md) |

## 模块依赖关系

```
tool-modules → popup
tool-modules → tools-panel
encoding-tools → tools-panel
excel-converter → tools-panel
json-cleaner → tools-panel
```

## 状态说明
- ✅ 稳定
- 🚧 开发中
- 📝 规划中
