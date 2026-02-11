# 变更提案: json-cleaner-path-extract

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
当前 `JSON 清理` 工具已支持手工填写 JSONPath 规则，并且 `JSON 格式化` 页已支持“一键清理”传输 JSON 文本（提交 `42331a5`）。

但规则仍需手工输入，用户希望可以直接在格式化后的 JSON Tree 中选择字段或节点，并将路径直接提取到清理规则中，减少手工复制与输入错误。

### 目标
- 在 `JSON 格式化` 视图中支持“选中字段/节点 → 提取为清理规则”。
- 支持将提取出的规则随 JSON 一并传递到 `JSON 清理` 页。
- `JSON 清理` 页自动合并规则到“规则列表”（去重、保序），并可直接执行清理。
- 兼容现有功能：JSONPath 查询填充、一键清理、手工编辑规则不回归。

### 非目标
- 不改造为复杂的可视化规则编辑器（本次仅支持路径提取）。
- 不引入后端服务，全部逻辑保持前端本地执行。

### 验收标准
- [ ] `JSON 格式化` 页可对叶子字段与容器节点提取规则。
- [ ] 提取规则可累积多条，并在跳转 `JSON 清理` 时自动带入。
- [ ] `JSON 清理` 页将导入规则写入“规则列表”文本区（去重、保序）。
- [ ] 导入规则后可自动执行清理，且统计信息正确。
- [ ] 无规则时保持现有“一键清理”行为不变。
- [ ] 新增测试覆盖：规则传递、合并去重、兼容旧 payload。

---

## 2. 现状分析

### 已有能力
- `components/JsonFormatter.tsx`:
  - 支持 `JsonTree` 的 `onFillPath`，当前仅用于回填查询框。
  - `handleSendToCleaner` 会调用 `setJsonCleanerPrefill(sourceText, { autoRun: true })`，仅传 JSON 文本。
- `utils/json-cleaner-handoff.ts`:
  - payload 仅包含 `jsonText/autoRun/source/createdAt`。
- `components/JsonCleaner.tsx`:
  - 规则来源为手工编辑 `expressionsText`，可自动执行但不支持导入规则。

### 差距
- 缺少“节点选择 → 规则提取”的 UI 与状态。
- 缺少规则在工具间传输的数据结构。
- 缺少导入规则与本地规则合并策略（去重、顺序、提示文案）。

---

## 3. 方案对比

### 方案 A（推荐）：Formatter 侧提取 + Handoff 扩展传输规则
- 做法:
  - 在 `JsonTree` 行操作新增“提取规则”按钮。
  - `JsonFormatter` 维护待提取规则集合。
  - 扩展 handoff payload，附带 `ruleExpressions`。
  - `JsonCleaner` 启动时合并导入规则到规则列表并自动执行。
- 优点:
  - 改动集中，复用现有 handoff 链路。
  - 用户心智简单：在哪看到字段，在哪提取规则。
  - 与现有“一键清理”行为兼容。
- 缺点:
  - 需要对 `JsonTree` 行组件增加一个新回调，涉及复用组件接口变更。

### 方案 B：仅在 Cleaner 侧新增 JSON Tree 选择规则
- 做法:
  - 清理页新增预览树，用户在清理页选择节点生成规则。
- 优点:
  - 不改 `JsonFormatter`。
- 缺点:
  - 交互重复（格式化页已可看树），页面复杂度明显提升。
  - 不符合“在格式化 JSON 中直接选择”的原始诉求。

### 决策
采用 **方案 A**。

---

## 4. 详细设计（方案 A）

### 4.1 数据模型与传输
- 文件: `utils/json-cleaner-handoff.ts`
- 扩展 `JsonCleanerHandoffPayload`:
  - 新增可选字段 `ruleExpressions?: string[]`
- 扩展 `setJsonCleanerPrefill` 的 `options`:
  - 新增 `ruleExpressions?: string[]`
- 兼容策略:
  - 旧 payload 不含 `ruleExpressions` 时按空数组处理。
  - 读取阶段做类型守卫，非法值自动忽略。

### 4.2 Formatter 侧交互
- 文件: `components/ui/json-tree/rows.tsx`, `components/ui/JsonTree.tsx`
- 新增可选回调 `onExtractRulePath?: (path: string) => void`。
- 在叶子与容器行 Hover 区新增“提取规则”按钮（不替代已有“填充 JSONPath”按钮）。

- 文件: `components/JsonFormatter.tsx`
- 新增状态:
  - `selectedRulePaths: string[]`（或 `Set` + 序列化）
- 新增行为:
  - 点击“提取规则”将 path 加入集合（已存在则忽略）。
  - 提供“清空提取规则”入口。
  - `handleSendToCleaner` 附带 `ruleExpressions`。
- 交互反馈:
  - Header/Toolbar 展示“已提取 N 条规则”。
  - 跳转前提示导入条数（失败时延续现有错误提示）。

### 4.3 Cleaner 侧规则落盘与执行
- 文件: `components/JsonCleaner.tsx`
- 启动逻辑扩展:
  - `consumeJsonCleanerPrefill()` 后读取 `ruleExpressions`。
  - 与当前 `expressionsText` 合并（去重、保序）后写回文本区。
  - 更新 `handoffMessage`：例如“已导入 JSON + 3 条规则”。
- 自动执行策略:
  - 若导入后有效规则数 > 0 且 `autoRun=true`，执行清理。
  - 若无有效规则，维持当前“请先配置清理规则”提示。

### 4.4 测试设计
- 文件: `tests/json-cleaner-handoff.test.js`
  - 新增断言：`ruleExpressions` 能写入、读取、消费。
  - 兼容断言：无 `ruleExpressions` 的历史 payload 仍可读取。
- 新增文件: `tests/json-cleaner-rule-merge.test.js`（建议）
  - 覆盖规则合并函数：去重、空值过滤、顺序保留。

---

## 5. 影响范围

```yaml
核心变更:
  - components/JsonFormatter.tsx
  - components/JsonCleaner.tsx
  - components/ui/JsonTree.tsx
  - components/ui/json-tree/rows.tsx
  - utils/json-cleaner-handoff.ts

测试变更:
  - tests/json-cleaner-handoff.test.js
  - tests/json-cleaner-rule-merge.test.js (新增)

知识库同步:
  - helloagents/modules/json-cleaner.md
  - helloagents/CHANGELOG.md
```

---

## 6. 风险与应对

| 风险 | 等级 | 应对 |
|------|------|------|
| 提取规则与查询填充按钮混淆 | 中 | 区分图标与 tooltip，文案明确“填充查询/提取规则” |
| 规则过多导致 UI 拥挤 | 低 | 只显示计数与清空入口，不展示长列表 |
| 导入规则覆盖用户已编辑规则 | 中 | 采用“合并去重”而非覆盖，并在提示中说明 |
| 旧 handoff 数据兼容问题 | 中 | 保持字段可选，读取阶段容错 |

---

## 7. 决策记录

- `json-cleaner-path-extract#D001`: 节点提取能力落在 Formatter 页，而非 Cleaner 页。
- `json-cleaner-path-extract#D002`: 规则通过 handoff payload 新增字段传输，复用既有跳转链路。
- `json-cleaner-path-extract#D003`: Cleaner 导入策略采用“合并去重保序”，不覆盖本地已有编辑内容。

---

## 8. 执行建议

建议下一步使用 `~exec` 执行本方案包，按任务清单逐项落地并补齐测试与知识库同步。
