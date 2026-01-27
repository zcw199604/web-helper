# 项目技术约定

---

## 技术栈
- **运行环境:** Node.js（建议 20.x）
- **扩展框架:** WXT（MV3）
- **前端:** React + TypeScript
- **路由:** `react-router-dom`（`HashRouter`）
- **样式:** Tailwind CSS（含项目级 CSS 变量）

---

## 代码结构约定

### 入口与扩展形态
- `entrypoints/devtools.html`：DevTools 入口（由 manifest 的 `devtools_page` 指定）
- `utils/devtools-init.ts`：创建 DevTools 面板并加载 `tools.html`
- `entrypoints/tools.html/*`：面板内工具箱应用（左侧菜单 + 路由）
- `entrypoints/popup/*`：扩展 Popup（如有）
- `entrypoints/background.ts`：后台脚本
- `entrypoints/content.ts`：内容脚本（匹配规则见其定义）

### 业务与工具模块
- `components/*`：各工具页面组件（每个工具尽量自包含，纯逻辑下沉到 `utils/`）
- `utils/*`：通用纯函数工具（JSON、URL、JWT、Cron 等）
- `utils/tool-modules.ts`：工具模块注册表（面板菜单与 Popup 菜单共用）
- `utils/ui-config.ts`：UI 配置（如 Popup 菜单展示白名单）
- `components/ui/*`：通用 UI 组件（按钮、Tree 视图等）

---

## 开发约定
- **命名:** 组件使用 PascalCase，工具函数使用 camelCase。
- **依赖引入:** 优先选轻量、浏览器友好、维护活跃的依赖；新增依赖需评估体积与许可。
- **安全:** 只做文本解析/格式化，不执行任何外部命令；不在本地持久化敏感数据（除非明确需求）。
- **可用性:** 工具页面应提供明确的输入/输出区域，并支持复制与下载（如适用）。

---

## 错误与日志
- UI 侧对解析错误使用可见的错误提示。
- 调试日志仅用于开发，避免在生产流程中输出大量敏感内容。

---

## 构建与验证
- 本地开发：`npm run dev`
- 类型检查：`npm run compile`
- 构建：`npm run build`
