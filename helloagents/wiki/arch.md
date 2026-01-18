# 架构设计

## 总体架构

```mermaid
flowchart TD
    A[Browser Extension (MV3)] --> B[devtools_page: devtools.html]
    B --> C[utils/devtools-init.ts]
    C --> D[DevTools Panel: tools.html]
    D --> E[React App: entrypoints/tools.html]
    E --> F[Routes + Nav]
    F --> G[components/* Tools]
    A --> H[popup]
    A --> I[background]
    A --> J[content script]
```

## 技术栈
- **前端:** React + TypeScript
- **扩展框架:** WXT（MV3）
- **路由:** `react-router-dom`（HashRouter）
- **样式:** Tailwind CSS

## 核心流程

```mermaid
sequenceDiagram
    participant DevTools as Chrome DevTools
    participant Ext as Web Helper Extension
    participant Panel as Web Helper Panel (tools.html)

    DevTools->>Ext: 打开 DevTools
    Ext->>Ext: 执行 devtools.html
    Ext->>Panel: 创建并加载 tools.html 面板
    Panel->>Panel: React 渲染 + 路由初始化
    Panel->>Panel: 用户选择工具并使用
```

## 重大架构决策

| adr_id | title | date | status | affected_modules | details |
|--------|-------|------|--------|------------------|---------|

