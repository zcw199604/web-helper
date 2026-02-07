# excel-converter

## 职责

提供“Excel 转换”工具页能力，支持两类输入源：
- 默认：直接粘贴 Excel/CSV 表格文本（TSV/CSV）
- 可选：导入 `.xlsx/.xls` 文件

并统一导出为：
- JSON
- INSERT SQL（mysql / oracle / pg）
- XML

## 接口定义

### 公共 API（utils/excel-converter.ts）
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `parseTableText` | `input, { delimiter }` | `NormalizedTableData` | 解析粘贴文本（自动/Tab/Comma） |
| `parseExcelWorkbook` | `arrayBuffer` | `ParsedWorkbookData` | 解析 Excel 工作簿与工作表数据 |
| `toJsonText` | `data, { indent }` | `string` | 导出格式化 JSON 文本 |
| `toInsertSqlText` | `data, { dialect, tableName }` | `string` | 导出 INSERT SQL，支持方言 |
| `toXmlText` | `data, { rootName, rowName }` | `string` | 导出 XML 文本并转义字符 |

## 行为规范

### 默认粘贴优先
**条件**: 用户打开“Excel 转换”页面
**行为**: 首屏展示粘贴输入区，允许直接粘贴 Excel/WPS/Sheets 数据
**结果**: 无需先上传文件即可转换

### SQL 方言切换
**条件**: 输出类型为 SQL
**行为**: 用户可在 mysql / oracle / pg 间切换
**结果**: 标识符引用与字面量输出按方言规则生成

### 统一数据归一化
**条件**: 输入来源为粘贴或文件
**行为**: 均先转换为 `columns + rows` 中间模型（含表头修正）
**结果**: JSON/SQL/XML 三种导出复用同一数据基线

## 关键文件
- `components/ExcelConverter.tsx`
- `utils/excel-converter.ts`
- `tests/excel-converter.test.js`
- `utils/tool-modules.ts`
- `entrypoints/tools.html/App.tsx`

## 依赖关系

```yaml
依赖:
  - tools-panel
  - tool-modules
被依赖: []
```
