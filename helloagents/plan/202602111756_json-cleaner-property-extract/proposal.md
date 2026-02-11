# 变更提案: json-cleaner-property-extract

## 元信息
```yaml
类型: 功能增强
方案类型: implementation
优先级: P1
状态: 规划中
状态: 已实施
创建: 2026-02-11
触发命令: ~plan
```

---

## 1. 需求定义

### 背景
当前 JSON 清理规则提取链路已支持“节点路径提取”（从格式化 Tree 选择节点，提取 JSONPath 到清理规则）。

你反馈的核心问题是：目前提取更偏向“对象节点”，还需要明确支持“属性级别”删除（字段级删除），即不仅能删某个对象节点，也能删某个属性。

### 目标
- 在提取规则交互中显式区分：
  - 节点规则（删除当前节点）
  - 属性规则（删除某个属性/字段）
- 属性规则支持“按属性名提取”而非仅依赖完整节点路径。
- 规则提取结果可直接进入清理规则区并保持现有合并/去重逻辑。

### 非目标
- 不改造清理引擎核心删除语义（仍使用 JSONPath 命中 + parentProperty 删除）。
- 不引入后端服务或远程规则中心。

### 验收标准
- [ ] 在 Tree 中可分别提取“节点规则”和“属性规则”。
- [ ] 属性规则可用于删除字段（含叶子字段、对象类型字段）。
- [ ] 复杂属性名（含 `-`、空格、中文等）可正确生成 JSONPath。
- [ ] 与现有“泛化/精确索引切换”“一键清理导入”兼容。
- [ ] 测试覆盖属性规则生成与规则执行场景。

---

## 2. 现状分析与缺口

### 现状
- `JsonTree` 已提供 `onExtractRulePath(path, mode)` 回调，当前仅传路径。
- `JsonFormatter` 通过 `upsertJsonCleanExtractedPath` 管理提取规则，核心是路径归一化/切换。
- `JsonCleaner` 能消费导入规则并执行清理。

### 缺口
- 当前提取模型是“路径即规则”，缺少“属性语义规则”的独立入口。
- 用户无法直接表达“按属性名删除”的意图（例如全局删 `password` 或属性级删字段）。

---

## 3. 方案设计

### 3.1 规则提取类型扩展
- 新增提取类型：
  - `node`：沿用当前路径提取（保持现有模式）。
  - `property`：基于当前行的属性名生成属性规则。

### 3.2 属性规则生成策略（推荐）
- 当行具备 `name`（对象属性）时，生成属性规则：
  - 简单 key：`$..{key}`（示例：`$..password`）
  - 非简单 key：`$..["{escapedKey}"]`（示例：`$..["user-name"]`）
- 当行无 `name`（数组元素）时：属性规则入口禁用或提示“不适用”。

### 3.3 UI/交互
- 在 Tree 行操作区增加“提取属性规则”按钮（与“提取节点规则”并列）。
- 已提取规则区增加类型标记：`节点` / `属性`。
- 保留现有交互：
  - 二次点击切精确索引（节点规则）
  - 右键直接精确（节点规则）
  - 单条移除 / 全部清空

### 3.4 数据与兼容
- 继续使用 `ruleExpressions: string[]` 传输，不改 payload 协议。
- 属性规则只是新增规则来源，不影响 `JsonCleaner` 消费结构。

---

## 4. 影响范围

```yaml
实现文件:
  - components/ui/json-tree/rows.tsx
  - components/ui/JsonTree.tsx
  - components/JsonFormatter.tsx
  - utils/json-cleaner-rule-expressions.ts

测试文件:
  - tests/json-cleaner-rule-expressions.test.js
  - tests/json-cleaner.test.js (属性规则执行补充)

文档文件:
  - helloagents/modules/json-cleaner.md
  - helloagents/CHANGELOG.md
```

---

## 5. 风险与应对

| 风险 | 等级 | 应对 |
|------|------|------|
| `$..key` 作用域过大导致误删 | 中 | 提供提示文案，默认仅在明确点击“属性规则”时生成 |
| 特殊 key 语法生成错误 | 中 | 增加 key 转义函数与测试用例 |
| UI 按钮过多导致操作混淆 | 中 | 图标+tooltip 明确区分“节点/属性” |

---

## 6. 决策记录

- `json-cleaner-property-extract#D001`: 提取语义拆分为节点规则与属性规则。
- `json-cleaner-property-extract#D002`: 属性规则采用 JSONPath 递归下降（`$..key` / `$..["key"]`）。
- `json-cleaner-property-extract#D003`: 保持 handoff 协议不变，仅增加规则来源。

---

## 7. 执行建议

建议下一步执行 `~exec 202602111756_json-cleaner-property-extract`，按任务清单实现属性级提取并回归验证。
