# Web Helper - 开发者工具箱浏览器插件

## 项目概述

Chrome 浏览器扩展插件，提供常用开发者工具：
- JSON 格式化/压缩/验证
- Base64 编码/解码
- URL 编码/解码/参数解析
- Cron 表达式解析（支持中文描述）
- JWT Token 解码（显示过期状态）

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| WXT | ^0.20.x | 浏览器扩展开发框架 |
| React | 19.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 原子化样式 |
| react-router-dom | 7.x | 路由管理 |

### 功能依赖
- `cron-parser` + `cronstrue` — Cron 表达式解析
- `jwt-decode` — JWT 解码
- `lucide-react` — 图标库
- `clsx` + `tailwind-merge` — 样式工具

## 项目结构

```
web-helper/
├── components/              # 功能组件
│   ├── JsonFormatter.tsx    # JSON 格式化工具
│   ├── Base64Tool.tsx       # Base64 编解码工具
│   ├── UrlEncoder.tsx       # URL 编解码工具
│   ├── CronParser.tsx       # Cron 表达式解析
│   └── JwtDecoder.tsx       # JWT 解码工具
├── entrypoints/             # WXT 入口点
│   ├── popup/               # 弹窗页面（功能入口列表）
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── tools.html/          # 独立工具页面（主功能区）
│   │   ├── App.tsx          # 包含侧边栏和路由
│   │   ├── main.tsx
│   │   └── index.html
│   ├── background.ts        # Service Worker
│   └── content.ts           # 内容脚本
├── utils/                   # 工具函数
│   ├── json.ts              # JSON 处理
│   ├── base64.ts            # Base64 编解码
│   ├── url.ts               # URL 编解码
│   ├── cron.ts              # Cron 表达式处理
│   ├── jwt.ts               # JWT 解码
│   ├── cn.ts                # Tailwind 类名合并
│   └── index.ts             # 统一导出
├── assets/
│   └── styles/
│       └── globals.css      # 全局样式 + Tailwind 主题
├── public/                  # 静态资源
├── wxt.config.ts            # WXT 配置（manifest 定义）
├── postcss.config.js        # PostCSS 配置
├── tsconfig.json            # TypeScript 配置
└── package.json
```

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# Firefox 开发模式
npm run dev:firefox

# 生产构建
npm run build

# 打包成 zip
npm run zip

# TypeScript 类型检查
npm run compile
```

## 构建输出

- Chrome: `.output/chrome-mv3/`
- Firefox: `.output/firefox-mv3/`

## 安装插件（开发测试）

1. 运行 `npm run build`
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `.output/chrome-mv3` 目录

## 代码规范

- 所有注释使用中文
- 接口路径使用驼峰命名
- 使用 Tailwind CSS 进行样式开发
- 工具函数放在 `utils/` 目录
- 页面组件放在 `components/` 目录

## 关键文件说明

| 文件 | 作用 |
|------|------|
| `wxt.config.ts` | WXT 配置，定义 manifest.json 内容 |
| `entrypoints/popup/App.tsx` | Popup 弹窗，显示工具列表 |
| `entrypoints/tools.html/App.tsx` | 独立工具页，包含路由和侧边栏 |
| `utils/*.ts` | 各功能的核心工具函数 |
| `components/*.tsx` | 各功能的 UI 组件 |

## 路由结构

独立工具页面使用 HashRouter，路由如下：
- `/json` — JSON 格式化
- `/base64` — Base64 转换
- `/url` — URL 编解码
- `/cron` — Cron 表达式
- `/jwt` — JWT 解码

## 扩展权限

在 `wxt.config.ts` 中定义的权限：
- `storage` — 本地存储
- `clipboardWrite` — 写入剪贴板
- `clipboardRead` — 读取剪贴板
