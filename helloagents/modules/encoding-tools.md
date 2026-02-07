# encoding-tools

## 职责

提供“编码转换”页面的交互逻辑与统一操作注册表，覆盖 21 项加密/解密能力（Unicode、URL、UTF16(\\x)、Base64、MD5、SHA1、Hex、HTML、JWT、Cookie、Gzip）。

## 接口定义

### 公共API（utils/encoding-toolkit.ts）
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `runEncodingOperation` | `operationId, input` | `string` | 统一执行入口（含空输入校验） |
| `ENCODING_OPERATIONS` | - | `EncodingOperationDefinition[]` | 操作注册表（21项，含分组与提示） |
| `gzipCompress` | `input: string` | `string` | Gzip 压缩，输出 Base64 |
| `gzipDecompress` | `input: string` | `string` | Gzip 解压，输入 Base64 |
| `decodeJwtLite` | `input: string` | `string` | 轻量解析 JWT，输出 JSON |
| `formatCookieToJson` | `input: string` | `string` | 格式化 Cookie，输出 JSON |

## 行为规范

### 操作分组渲染
**条件**: 页面加载 `components/EncodingTools.tsx`
**行为**: 根据 `ENCODING_OPERATIONS` 按 `encrypt/decrypt` 分组生成按钮
**结果**: UI 与能力清单一一对应，新增能力只需维护注册表

### 输入输出约定
**条件**: 用户触发编码/解码能力
**行为**:
- Gzip：压缩输出 Base64，解压输入 Base64
- UTF16(\\x)：按字节十六进制转义解释（`\\xHH`）
- JWT/Cookie/URL参数：输出格式化 JSON 字符串
**结果**: 行为一致、可复制、可测试

### 错误处理
**条件**: 空输入或格式非法
**行为**: 抛出可读错误并在 UI 显示
**结果**: 不覆盖上一次成功结果，定位问题更直观

## 测试覆盖

- `tests/encoding-tools.test.js`
  - 21 项操作 × 3 类场景（正常/空输入/非法输入）
  - 关键能力专项测试：Unicode、UTF16(\\x)、HTML实体、URL参数、JWT、Cookie、Gzip

## 依赖关系

```yaml
依赖:
  - tool-modules
被依赖:
  - tools-panel
```
