# Roadmap — Legado iOS

> 任务追踪：GitHub Issues（待创建 repo 后同步）
> 设计文档：`docs/specs/`

## 状态图例

| 图标 | 含义 |
|------|------|
| ✅ | 已完成 |
| 📐 | 设计完成，待实现 |
| 🔨 | 开发中 |
| ⬜ | 未开始 |

---

## 🏷️ 基础框架

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| T0001 | 项目初始化（Vite + React + TypeScript） | — | — | ✅ |
| [T0002](https://github.com/szylover/legado-web/issues/1) | 数据模型（BookSource / Book / BookChapter / RssSource / ReplaceRule） | T0001 | [spec](specs/T0002-data-models.md) | ✅ |
| [T0003](https://github.com/szylover/legado-web/issues/2) | 数据库层（Dexie IndexedDB DAO） | T0002 | — | ✅ |
| [T0004](https://github.com/szylover/legado-web/issues/3) | react-router-dom 导航结构（Tab + Stack） | T0001 | — | ✅ |

---

## 🏷️ 规则引擎（最核心）

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0010](https://github.com/szylover/legado-web/issues/4) | RuleAnalyzer（规则字符串分段器） | T0002 | [spec](specs/T0010-rule-analyzer.md) | ✅ |
| [T0011](https://github.com/szylover/legado-web/issues/5) | AnalyzeByCSS（cheerio CSS 选择器） | T0010 | — | ✅ |
| [T0012](https://github.com/szylover/legado-web/issues/6) | AnalyzeByXPath（xpath + xmldom） | T0010 | — | ✅ |
| [T0013](https://github.com/szylover/legado-web/issues/7) | AnalyzeByJSONPath（jsonpath-plus） | T0010 | — | ✅ |
| [T0014](https://github.com/szylover/legado-web/issues/8) | AnalyzeByRegex（正则规则） | T0010 | — | ✅ |
| [T0015](https://github.com/szylover/legado-web/issues/9) | JSEngine（JS eval 规则，书源内嵌 JS） | T0010 | — | ✅ |
| [T0016](https://github.com/szylover/legado-web/issues/10) | AnalyzeRule（主规则入口，组合以上所有） | T0011, T0012, T0013, T0014, T0015 | — | ✅ |

---

## 🏷️ 网络层

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0020](https://github.com/szylover/legado-web/issues/11) | AnalyzeUrl（URL 模板解析器，支持 POST/Header/变量替换） | T0002 | [spec](specs/T0020-analyze-url.md) | ✅ |
| [T0021](https://github.com/szylover/legado-web/issues/12) | HttpClient（fetch 封装，User-Agent、Cookie、重定向） | T0020 | — | ✅ |
| T0022 | CookieStore（按域名持久化 Cookie） | T0021 | — | ✅ |

---

## 🏷️ 书源与书籍流程

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0030](https://github.com/szylover/legado-web/issues/13) | 书源导入/导出（JSON 解析，兼容 legado Android 格式） | T0003, T0016 | — | ✅ |
| [T0031](https://github.com/szylover/legado-web/issues/14) | WebBook.search（通过书源搜索书籍） | T0016, T0022 | — | ✅ |
| T0032 | WebBook.getBookInfo（获取书籍详情页） | T0031 | — | ✅ |
| T0033 | WebBook.getChapterList（获取目录） | T0032 | — | ✅ |
| T0034 | WebBook.getContent（获取正文） | T0033 | — | ✅ |

---

## 🏷️ 本地书籍

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| T0040 | TXT 解析（智能目录识别） | T0003 | — | ⬜ |
| T0041 | EPUB 解析 | T0003 | — | ⬜ |

---

## 🏷️ UI — 书架

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0050](https://github.com/szylover/legado-web/issues/15) | 书架页面（列表/网格切换，分组） | T0003, T0004 | — | ✅ |
| T0051 | 书籍卡片组件（封面、进度、更新状态） | T0050 | — | ✅ |
| T0052 | 书籍详情页 | T0032, T0050 | — | ✅ |
| [T0053](https://github.com/szylover/legado-web/issues/46) | 书架网格/列表切换 + 排序 | T0050 | — | ✅ |
| [T0054](https://github.com/szylover/legado-web/issues/47) | 书架一键更新所有书 | T0050 | — | ✅ |
| [T0055](https://github.com/szylover/legado-web/issues/54) | 书架分组 Tab（自定义分组、书籍归组）| T0050 | — | ✅ |

---

## 🏷️ UI — 阅读器

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0060](https://github.com/szylover/legado-web/issues/16) | 阅读器基础（文字渲染、滚动翻页） | T0034, T0004 | — | ✅ |
| T0061 | 阅读设置面板（字体/字号/行距/背景/亮度） | T0060 | — | ✅ |
| T0062 | 翻页动画（仿真翻页） | T0060 | — | ⬜ |
| T0063 | 目录侧边栏 | T0060 | — | ✅ |
| T0064 | 书签 | T0060 | — | ✅ |
| [T0065](https://github.com/szylover/legado-web/issues/49) | 阅读器亮度控制 + 字体选择 | T0061 | — | ✅ |
| [T0066](https://github.com/szylover/legado-web/issues/50) | 屏幕常亮（Wake Lock） | T0060 | — | ✅ |
| [T0067](https://github.com/szylover/legado-web/issues/51) | 阅读器页边距 + 字间距 | T0061 | — | ✅ |
| [T0068](https://github.com/szylover/legado-web/issues/52) | 阅读进度百分比显示 | T0060 | — | ✅ |

---

## 🏷️ UI — 搜索 & 发现

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| T0070 | 搜索页面（多书源聚合搜索） | T0031, T0050 | — | ✅ |
| [T0072](https://github.com/szylover/legado-web/issues/48) | 搜索历史 | T0070 | — | ✅ |
| [T0073](https://github.com/szylover/legado-web/issues/55) | 搜索结果聚合去重（多来源合并） | T0070 | — | ✅ |
| T0071 | 发现页面（书源 Explore 规则） | T0031 | — | ✅ |

---

## 🏷️ UI — 书源管理

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| T0080 | 书源列表（启用/禁用/排序/分组） | T0030 | — | ✅ |
| T0081 | 书源编辑器（表单编辑所有规则字段） | T0080 | — | ✅ |
| T0082 | 书源调试工具（测试搜索/目录/正文） | T0016, T0080 | — | ✅ |

---

## 🏷️ 高级功能

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| T0090 | 替换净化规则 | T0034 | — | ✅ |
| T0091 | RSS 订阅 | T0003, T0022 | — | ✅ |
| T0092 | TTS 朗读 | T0060 | — | ✅ |
| T0093 | 备份/恢复（WebDAV） | T0003 | — | ⬜ |

---

## 🏷️ 发布

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0100](https://github.com/szylover/legado-web/issues/17) | Web 部署配置（Azure Static Web Apps） | T0001 | — | ✅ |
| T0101 | PWA 配置（Service Worker + 离线缓存） | T0100 | — | ✅ |
| T0102 | 生产发布 | T0060, T0100 | — | ⬜ |
