# Legado iOS — Copilot 工作指南

本项目是 [legado (开源阅读)](https://github.com/gedoor/legado) 的 iOS 版本，使用 React Native + Expo 实现。

## 项目架构

```
legado-ios/
├── app/                    # expo-router 页面（文件路由）
│   ├── (tabs)/             # 底部 Tab 页面
│   │   ├── index.tsx       # 书架
│   │   ├── explore.tsx     # 发现
│   │   └── settings.tsx    # 设置
│   ├── reader/[id].tsx     # 阅读器
│   └── book/[id].tsx       # 书籍详情
├── src/
│   ├── core/
│   │   ├── ruleEngine/     # 书源规则引擎（CSS/XPath/JSONPath/Regex/JS）
│   │   ├── network/        # HTTP 客户端、Cookie、AnalyzeUrl
│   │   └── localBook/      # 本地 TXT/EPUB 解析
│   ├── data/
│   │   ├── models/         # TypeScript 接口（100% 兼容 legado JSON 格式）
│   │   ├── database/       # expo-sqlite 初始化、migration
│   │   └── dao/            # 数据访问层
│   ├── components/
│   │   ├── bookshelf/      # 书架组件
│   │   ├── reader/         # 阅读器组件
│   │   └── common/         # 通用组件
│   ├── stores/             # Zustand 全局状态
│   ├── utils/              # 工具函数
│   └── constants/          # 常量、主题
└── docs/
    ├── roadmap.md          # 任务路线图（链接到 GitHub Issues）
    ├── specs/              # Design Spec 文档
    └── tasks/              # 任务文件 (todo/active/done)
```

## Agent 角色

| 角色 | 文件 | 职责 |
|------|------|------|
| **@PM** | `.github/agents/pm.agent.md` | 需求分析、设计文档、任务管理 |
| **@Dev** | `.github/agents/dev.agent.md` | RN 代码实现（基于 Spec） |
| **@Native** | `.github/agents/native.agent.md` | 原生模块、Expo 配置、发布 |

## 核心设计原则

1. **书源 100% 兼容** — 能直接导入 legado Android 书源 JSON
2. **规则引擎完整** — CSS selector / XPath / JSONPath / Regex / JS eval 全部支持
3. **OTA 更新** — Expo EAS Update，App Shell 发布后所有逻辑可云端推送
4. **离线优先** — 书籍内容、章节缓存到本地 SQLite

## 技术栈

- React Native 0.76 + Expo 52
- expo-router（文件路由）
- expo-sqlite（数据持久化）
- expo-updates（OTA 热更新）
- cheerio（CSS 规则解析）
- xpath + xmldom（XPath 规则解析）
- jsonpath-plus（JSONPath 规则解析）
- Zustand（状态管理）

## 关键路径

书源规则引擎 → 网络层 → WebBook（在线读书流程） → 阅读器

## Git 规范

- 分支：`feat/T0XXX-描述`、`fix/描述`、`chore/描述`
- Commit：`feat(T0XXX): 描述` + `Closes #N`
- 不直接 push main，走 PR
