# 任务清单: popup-modules-config

> **@status:** completed | 2026-01-27 19:25

目录: `helloagents/plan/202601271923_popup-modules-config/`

---

## 任务状态符号说明

| 符号 | 状态 | 说明 |
|------|------|------|
| `[ ]` | pending | 待执行 |
| `[√]` | completed | 已完成 |
| `[X]` | failed | 执行失败 |
| `[-]` | skipped | 已跳过 |
| `[?]` | uncertain | 待确认 |

---

## 执行状态
```yaml
总任务: 6
已完成: 6
完成率: 100%
```

---

## 任务列表

### 1. 开发（菜单配置统一 + Popup 可配置）

- [√] 1.1 新增工具模块注册表 `utils/tool-modules.ts`（面板与 Popup 共用）
  - 验证: `npm run compile`

- [√] 1.2 新增 Popup 菜单配置 `utils/ui-config.ts`（`popupVisibleToolIds` 白名单）
  - 验证: Popup 编译通过且不影响运行

- [√] 1.3 重构 Popup 菜单为“注册表 + 白名单过滤”渲染
  - 文件: `entrypoints/popup/App.tsx`
  - 验证: `npm run build`

- [√] 1.4 重构面板菜单改为使用注册表生成
  - 文件: `entrypoints/tools.html/App.tsx`
  - 验证: `npm run build`

### 2. 验证与文档

- [√] 2.1 增加单元测试覆盖白名单过滤逻辑
  - 文件: `tests/tool-modules.test.js`
  - 验证: `node --test "tests/tool-modules.test.js"`

- [√] 2.2 同步项目知识库文档与变更记录
  - 文件: `helloagents/wiki/modules/tools-panel.md`、`helloagents/wiki/modules/popup.md`、`helloagents/CHANGELOG.md`

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
| 1.1-1.4 | completed | Popup 默认与面板一致；通过 `popupVisibleToolIds` 可裁剪 |
| 2.1 | completed | 使用 Node 内置 test runner，无新增依赖 |
| 2.2 | completed | 补充 Popup 模块文档与变更记录 |
