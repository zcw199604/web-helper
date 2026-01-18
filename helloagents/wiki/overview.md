# Web Helper - 开发者工具箱

> 本文件包含项目级别的核心信息。详细的模块文档见 `modules/` 目录。

---

## 1. 项目概述

### 目标与背景
Web Helper 是一个浏览器 DevTools 工具箱扩展，提供常用开发辅助能力（JSON、编码、Cron、JWT、API 调试等），并以 DevTools 面板形式集成。

### 范围
- **范围内:** 面向开发/测试的本地工具（解析、格式化、调试、导出）
- **范围外:** 服务端接口代理、自动化渗透/攻击、对生产环境做破坏性操作

### 干系人
- **负责人:** 项目维护者

---

## 2. 模块索引

| 模块名称 | 职责 | 状态 | 文档 |
|---------|------|------|------|
| 工具面板（DevTools） | 工具箱壳、路由与导航 | ✅稳定 | [modules/tools-panel.md](modules/tools-panel.md) |
| JSON 格式化 | JSON 格式化/压缩/查询 | ✅稳定 | [modules/json-formatter.md](modules/json-formatter.md) |
| 编码转换 | Base64/URL 编解码等 | ✅稳定 | [modules/encoding-tools.md](modules/encoding-tools.md) |
| Cron 表达式 | Cron 解析与人类可读描述 | ✅稳定 | [modules/cron-parser.md](modules/cron-parser.md) |
| JWT 解码 | JWT 解码与展示 | ✅稳定 | [modules/jwt-decoder.md](modules/jwt-decoder.md) |
| API 调试 | 发送请求、抓包/填充（HAR） | ✅稳定 | [modules/api-tester.md](modules/api-tester.md) |
| cURL → Markdown | 从 cURL 文本生成 Markdown 接口文档 | ✅稳定 | [modules/curl-to-md.md](modules/curl-to-md.md) |

---

## 3. 快速链接
- [技术约定](../project.md)
- [架构设计](arch.md)
- [API 手册](api.md)
- [数据模型](data.md)
- [变更历史](../history/index.md)
