# 任务清单: json-cleaner-path-extract

> **@status:** completed | 2026-02-11 10:03

目录: `helloagents/plan/202602110933_json-cleaner-path-extract/`

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
总任务: 17
已完成: 17
完成率: 100%
```

---

## 任务列表

### 0. 需求与边界确认

- [√] 0.1 明确“提取规则”与“填充查询”是两个独立动作
  - 验证: Tree 行操作存在两个独立按钮，文案可区分

- [√] 0.2 明确规则提取范围（叶子字段 + 容器节点）
  - 验证: 两类节点均可触发规则提取

### 1. Handoff 数据结构扩展

- [√] 1.1 扩展 `utils/json-cleaner-handoff.ts` payload：新增 `ruleExpressions?: string[]`
  - 验证: `peek/consume` 可读写新字段

- [√] 1.2 扩展 `setJsonCleanerPrefill` options：支持 `ruleExpressions`
  - 依赖: 1.1
  - 验证: 传入规则后可序列化到存储

- [√] 1.3 增加旧 payload 兼容处理（字段缺失/非法类型）
  - 依赖: 1.1
  - 验证: 历史数据不报错，按空规则处理

### 2. JsonTree 可复用交互扩展

- [√] 2.1 修改 `components/ui/json-tree/rows.tsx`：新增 `onExtractRulePath` 回调与按钮
  - 验证: 叶子行、容器行 hover 均可触发

- [√] 2.2 修改 `components/ui/JsonTree.tsx`：透传 `onExtractRulePath`
  - 依赖: 2.1
  - 验证: 现有 `onFillPath` 行为不受影响

### 3. Formatter 侧规则提取与传递

- [√] 3.1 修改 `components/JsonFormatter.tsx`：增加提取规则状态与去重逻辑
  - 验证: 重复点击同一路径不会重复累积

- [√] 3.2 新增“已提取规则数 + 清空规则”交互
  - 依赖: 3.1
  - 验证: 计数与清空行为正确

- [√] 3.3 扩展 `handleSendToCleaner`：连同 `ruleExpressions` 一并传输
  - 依赖: 1.2, 3.1
  - 验证: 跳转后清理页可收到规则列表

### 4. Cleaner 侧规则导入与执行

- [√] 4.1 修改 `components/JsonCleaner.tsx`：导入 handoff 规则并合并到规则文本
  - 验证: 与现有规则合并去重、顺序稳定

- [√] 4.2 更新 handoff 提示文案（包含规则导入数量）
  - 依赖: 4.1
  - 验证: 用户可感知导入数量与来源

- [√] 4.3 调整自动执行逻辑：导入后有有效规则时自动清理
  - 依赖: 4.1
  - 验证: 导入规则 + autoRun=true 时可直接看到输出

### 5. 测试与验证

- [√] 5.1 更新 `tests/json-cleaner-handoff.test.js`：覆盖规则字段读写与消费
  - 依赖: 1.1, 1.2
  - 验证: 新字段断言通过

- [√] 5.2 新增/补充规则合并测试（去重、空值过滤、顺序保留）
  - 依赖: 4.1
  - 验证: 合并结果稳定可预测

- [√] 5.3 执行 `npm run compile` 与相关测试回归
  - 依赖: 5.1, 5.2
  - 验证: 编译与测试通过，无既有功能回归

### 6. 文档与知识库同步（实施完成后）

- [√] 6.1 更新 `helloagents/modules/json-cleaner.md`（新增“从格式化页提取规则”说明）
  - 依赖: 5.3
  - 验证: 文档与实现一致

- [√] 6.2 更新 `helloagents/CHANGELOG.md` 记录本次增强
  - 依赖: 5.3
  - 验证: 变更条目可追踪到方案包

---

## 执行备注

| 任务 | 状态 | 备注 |
|------|------|------|
| 编译验证 | `[√]` | `npm run compile` 通过 |
| 测试验证 | `[√]` | `node --test tests/*.test.js` 通过（109/109） |
| 规则传输兼容 | `[√]` | 兼容旧 handoff payload（无 `ruleExpressions`） |
