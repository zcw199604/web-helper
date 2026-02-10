# 项目上下文

## 1. 基本信息

```yaml
名称: Web Helper
描述: 浏览器 DevTools 开发者工具箱（JSON/编码/Cron/JWT/API 调试/cURL→Markdown 等）
类型: 浏览器扩展（DevTools 面板 + Popup）
状态: 维护中
```

## 2. 技术上下文

```yaml
语言: TypeScript
框架: React
包管理器: npm
构建工具: WXT（基于 Vite）
```

### 主要依赖
| 依赖 | 版本 | 用途 |
|------|------|------|
| react / react-dom | ^19.2.3 | UI 运行时 |
| react-router-dom | ^7.11.0 | HashRouter 路由 |
| wxt | ^0.20.6 | 扩展开发/构建（MV3） |
| lucide-react | ^0.562.0 | 图标 |
| tailwindcss | ^4.1.18 | 样式 |

## 3. 项目概述

### 核心功能
- JSON 格式化/压缩/校验
- JSON 清理（按策略删除字段 + 策略持久化）
- 编码/解码工具（Unicode、URL、UTF16(\x)、Base64、Hex、HTML、Gzip）与 MD5/SHA1
- Cron 表达式解析与可读化
- JWT 解码
- API 调试
- cURL / fetch → Markdown 文档生成

### 项目边界
```yaml
范围内:
  - 面向开发/测试的本地工具（解析、格式化、调试、导出）
范围外:
  - 服务端接口代理
  - 自动化渗透/攻击
  - 对生产环境做破坏性操作
```

## 4. 开发约定

### 代码规范
```yaml
命名风格: 组件 PascalCase；工具函数 camelCase
文件命名: 按功能命名，必要时使用短横线分隔（如 devtools-init.ts）
目录组织: entrypoints/（入口）+ components/（页面组件）+ utils/（纯函数/配置）
```

### 错误处理
```yaml
日志: 仅用于开发调试，避免输出敏感内容
UI: 解析错误应提供可见提示
```

### 测试要求
```yaml
测试框架: Node 内置 test runner（node:test）
测试文件位置: tests/
类型检查: npm run compile
```

### Git规范
```yaml
分支策略: 未约定
提交格式: 未约定
```

## 5. 当前约束（源自历史决策）

| 约束 | 原因 | 决策来源 |
|------|------|---------|
| 面板路由使用 HashRouter | 扩展页面环境下路由更稳定 | - |
| Popup 菜单默认与面板一致 | 避免菜单配置分散导致不一致 | [202601271923_popup-modules-config#D001](archive/2026-01/202601271923_popup-modules-config/proposal.md) |
