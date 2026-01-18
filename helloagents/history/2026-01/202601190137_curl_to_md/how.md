# 技术设计: cURL → Markdown 文档生成

## 技术方案
### 核心技术
- WXT（MV3）+ React + TypeScript
- `shellwords@^1.1.1`：用于将归一化后的 cURL 文本安全分词（浏览器可用、体积小）

### 实现要点
- 文本处理流水线：`normalize (Windows CMD ^ 兼容) → tokenize (shellwords) → parse curl args → build RequestModel → render Markdown`
- 解析目标（以 Copy as cURL 为主）：URL、Method（`-X/--request`）、Headers（`-H/--header`）、Body（`--data*`、`-d`、`-F/--form` 的有限支持）
- Markdown 生成固定结构：请求行、Query 参数表、Headers 表、Body、示例（curl/fetch）、响应示例占位、字段说明占位
- UI：双栏布局（输入/输出），输出区支持复制与下载 `.md`

## API设计
无对外 API。

## 安全与性能
- **安全:**
  - 仅做文本解析与生成，不执行任何命令、不发起任何网络请求
  - 解析过程对输入做长度限制与异常捕获，避免 UI 卡死
- **性能:**
  - 解析与生成在用户输入后做轻量防抖（或显式点击“生成”按钮），避免每次键入都重算
  - 依赖选择以轻量与浏览器友好为优先

## 测试与部署
- **测试:** 以示例 cURL（Windows 多行）做解析回归；完成后运行 `npm run compile` 与 `npm run build` 验证
- **部署:** 沿用现有 WXT 构建与打包流程

