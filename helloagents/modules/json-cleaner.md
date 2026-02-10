# json-cleaner

## 职责

提供“JSON 清理”工具页能力：
- 按 JSONPath 规则删除多余字段
- 输出清理后的新 JSON
- 支持策略保存、加载、重命名、删除（本地持久化）

## 接口定义

### 公共 API（utils/json-cleaner.ts）
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `validateStrategy` | `{ expressions }` | `JsonCleanValidationResult` | 规则去重、语法校验与风险拦截（禁止 `$`） |
| `applyJsonCleanStrategy` | `input, strategy` | `JsonCleanResult` | 执行字段清理并返回结果摘要 + 明细 |

### 公共 API（utils/json-clean-strategy-store.ts）
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `listJsonCleanStrategies` | 无 | `JsonCleanStrategy[]` | 读取本地已保存策略 |
| `upsertJsonCleanStrategy` | `JsonCleanStrategyDraft` | `ok/error` + 策略对象 | 新增或更新策略（含重名校验） |
| `deleteJsonCleanStrategy` | `id` | `ok/error` + 删除结果 | 删除指定策略 |

## 行为规范

### 按策略执行清理
**条件**: 用户输入 JSON 并点击“执行清理”
**行为**: 使用 JSONPath 规则匹配目标字段，按父节点删除命中项
**结果**: 输出清理后的 JSON，并显示命中规则数、删除节点数、异常规则信息

### 数组删除顺序保护
**条件**: 单条规则命中同一数组内多个索引
**行为**: 按索引从大到小删除
**结果**: 避免索引偏移导致误删

### 策略持久化
**条件**: 用户保存策略
**行为**: 写入 localStorage（含 version 字段），并执行策略名唯一性校验
**结果**: 策略可在后续会话复用；存储空间不足时提示用户清理历史策略

## 关键文件
- `components/JsonCleaner.tsx`
- `utils/json-cleaner.ts`
- `utils/json-clean-strategy-store.ts`
- `tests/json-cleaner.test.js`
- `utils/tool-modules.ts`
- `entrypoints/tools.html/App.tsx`

## 依赖关系

```yaml
依赖:
  - tools-panel
  - tool-modules
被依赖: []
```
