# 任务清单: json-cleaner-property-extract

> **@status:** completed | 2026-02-11 18:12

目录: `helloagents/plan/202602111756_json-cleaner-property-extract/`

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
总任务: 13
已完成: 13
完成率: 100%
```

---

## 任务列表

### 1. 提取模型扩展

- [√] 1.1 扩展提取类型定义：节点规则 `node` + 属性规则 `property`
  - 验证: 类型可在 `JsonTree/rows/Formatter` 间传递

- [√] 1.2 在 `rows.tsx` 增加“提取属性规则”入口与可用性判断
  - 依赖: 1.1
  - 验证: 对有 `name` 的行可触发；数组元素行提示不适用

### 2. 属性规则生成能力

- [√] 2.1 在 `utils/json-cleaner-rule-expressions.ts` 新增属性规则生成函数
  - 验证: simple key 生成 `$..key`

- [√] 2.2 增加特殊 key 转义逻辑（`$..["key"]`）
  - 依赖: 2.1
  - 验证: 含空格/连字符/中文 key 路径正确

### 3. Formatter 集成

- [√] 3.1 `JsonFormatter` 接收提取类型并写入对应规则
  - 依赖: 1.1, 2.1
  - 验证: 节点提取与属性提取互不冲突

- [√] 3.2 规则明细区增加“节点/属性”标签展示
  - 依赖: 3.1
  - 验证: 可直观看出规则来源类型

- [√] 3.3 在格式化 Tree 视图支持“点击即清理属性”（橡皮擦）
  - 依赖: 3.1
  - 验证: 点击目标字段可立即删除并刷新输入/输出与树视图

### 4. 测试与验证

- [√] 4.1 更新 `tests/json-cleaner-rule-expressions.test.js` 覆盖属性规则生成
  - 依赖: 2.2
  - 验证: simple/special key 场景通过

- [√] 4.2 更新 `tests/json-cleaner.test.js` 覆盖属性规则执行效果
  - 依赖: 3.1
  - 验证: 属性规则可删除目标字段

- [√] 4.3 执行 `npm run compile` 与 `node --test tests/*.test.js`
  - 依赖: 4.1, 4.2
  - 验证: 编译通过、回归通过

### 5. 文档同步

- [√] 5.1 更新 `helloagents/modules/json-cleaner.md`（补充属性规则提取说明）
  - 依赖: 4.3
  - 验证: 文档描述与实现一致

- [√] 5.2 更新 `helloagents/CHANGELOG.md` 记录本次增强
  - 依赖: 4.3
  - 验证: 条目可追踪到方案包

- [√] 5.3 更新方案包状态与 `helloagents/INDEX.md`
  - 依赖: 5.2
  - 验证: 待执行方案数与状态一致

---

## 执行备注

| 任务 | 状态 | 备注 |
|------|------|------|
| 编译验证 | `[√]` | `npm run compile` 通过 |
| 测试验证 | `[√]` | `node --test tests/*.test.js` 通过（123/123） |
