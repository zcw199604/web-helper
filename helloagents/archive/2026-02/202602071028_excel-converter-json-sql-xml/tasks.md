# 任务清单: excel-converter-json-sql-xml

> **@status:** completed | 2026-02-07 10:49

目录: `helloagents/plan/202602071028_excel-converter-json-sql-xml/`

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
总任务: 19
已完成: 19
完成率: 100%
```

---

## 任务列表

### 0. 依赖与交互边界确认

- [√] 0.1 在 `package.json` 新增 `xlsx` 依赖并同步 `package-lock.json`
  - 验证: `npm install` 成功，`npm run compile` 无新增类型错误

- [√] 0.2 明确输入优先级：默认粘贴（TSV/CSV），文件上传（`.xlsx/.xls`）为可选入口
  - 验证: 页面草图/实现中“粘贴输入区”为首屏主区域

- [√] 0.3 确认 SQL 方言范围（`mysql / oracle / pg`）与最小语法支持边界
  - 验证: 文档中明确方言规则（标识符引用、字符串转义、NULL）

### 1. 转换核心模块（utils）

- [√] 1.1 新增 `utils/excel-converter.ts`：实现 `parseTableText`（TSV/CSV）
  - 验证: 粘贴文本可解析出列与行；可识别 Tab/逗号分隔

- [√] 1.2 在 `utils/excel-converter.ts` 实现 `parseExcelWorkbook`（`.xlsx/.xls`）
  - 依赖: 0.1
  - 验证: 给定 `ArrayBuffer` 可返回 sheet 列表及目标 sheet 的结构化数据

- [√] 1.3 在 `utils/excel-converter.ts` 实现行数据归一化（空表头/重复表头修正）
  - 依赖: 1.1, 1.2
  - 验证: 生成稳定列名（如 `column_1`, `name_2`）且顺序可预测

- [√] 1.4 在 `utils/excel-converter.ts` 实现 JSON 导出函数 `toJsonText`
  - 依赖: 1.3
  - 验证: 输出格式化 JSON，结构与归一化数据一致

- [√] 1.5 在 `utils/excel-converter.ts` 实现 XML 导出函数 `toXmlText`（含转义）
  - 依赖: 1.3
  - 验证: 特殊字符 `& < > \" '` 均正确转义，结构可解析

- [√] 1.6 在 `utils/excel-converter.ts` 实现 SQL 导出函数 `toInsertSqlText`（方言适配）
  - 依赖: 1.3, 0.3
  - 验证: MySQL/Oracle/PG 输出差异正确（标识符引用、字符串、NULL）

### 2. 工具页面实现（components）

- [√] 2.1 新增 `components/ExcelConverter.tsx` 基础页面（ToolHeader + ToolMain）
  - 验证: 页面在工具路由下可正常渲染

- [√] 2.2 实现默认“粘贴输入区”与“手动分隔符切换（自动/Tab/Comma）”
  - 依赖: 1.1, 2.1
  - 验证: 粘贴文本后可立即解析并显示行列统计

- [√] 2.3 实现可选“导入 Excel 文件”入口与 sheet 选择
  - 依赖: 1.2, 2.1
  - 验证: 上传后可切换 sheet 并刷新输出

- [√] 2.4 实现输出类型切换（JSON/SQL/XML）与统一触发转换
  - 依赖: 1.4, 1.5, 1.6, 2.2
  - 验证: 同一数据源下切换类型时输出正确变更

- [√] 2.5 实现 SQL 参数输入（方言选择 + 表名）并联动转换
  - 依赖: 2.4
  - 验证: 切换方言/表名后 SQL 即时更新

- [√] 2.6 实现输出区操作（复制、下载、清空、错误提示）
  - 依赖: 2.4
  - 验证: 复制提示正常，下载文件内容与输出一致，异常信息可读

### 3. 工具接入（路由与注册表）

- [√] 3.1 修改 `utils/tool-modules.ts`：新增 `excel-converter` ToolId 与菜单元信息
  - 验证: 左侧菜单出现“Excel 转换”

- [√] 3.2 修改 `entrypoints/tools.html/App.tsx`：注册 `ExcelConverter` 组件并新增路由
  - 依赖: 2.1, 3.1
  - 验证: 访问 `#/excel-converter` 可进入页面

### 4. 测试与验证

- [√] 4.1 新增 `tests/excel-converter.test.js`：覆盖粘贴路径（TSV/CSV）到 JSON/SQL/XML
  - 依赖: 1.1, 1.4, 1.5, 1.6
  - 验证: 正常样例全部通过

- [√] 4.2 补充文件导入路径测试（Workbook 解析 + Sheet 选择）
  - 依赖: 1.2, 4.1
  - 验证: `.xlsx/.xls` 样例转换结果可预测

- [√] 4.3 补充边界与异常测试（分隔符识别失败、空数据、特殊字符、空表名）
  - 依赖: 4.1
  - 验证: 错误路径返回可读错误信息

- [√] 4.4 执行回归检查（`npm run compile` + `node --test tests/*.test.js`）
  - 依赖: 3.2, 4.2, 4.3
  - 验证: 编译通过，无既有测试回归

### 5. 知识库与变更记录同步（开发实施完成后执行）

- [√] 5.1 更新 `helloagents/modules/_index.md` 与对应模块文档（新增 Excel 工具说明）
  - 依赖: 4.4
  - 验证: 模块索引可导航且内容与代码一致

- [√] 5.2 更新 `helloagents/CHANGELOG.md` 记录本次新增功能
  - 依赖: 4.4
  - 验证: 记录格式符合 Keep a Changelog 规范

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
| 方案包创建 | `[√]` | 已创建 `202602071028_excel-converter-json-sql-xml` |
| 需求澄清 | `[√]` | 已确认默认输入应为“直接粘贴 Excel 数据” |
| 其它模型审查 | `[√]` | 已调用 Gemini 交叉审查（SESSION_ID: `48a5d639-e978-457a-9473-bb53d1cea224`） |
| 编译验证 | `[√]` | `npm run compile` 通过 |
| 测试验证 | `[√]` | `node --test tests/*.test.js` 通过（99/99） |
