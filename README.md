# Legado iOS

开源阅读 iOS 版 —— 基于 [legado (Android)](https://github.com/gedoor/legado) 功能复刻。

## 技术栈
- Swift 5.9+
- SwiftUI
- Core Data（本地数据持久化）
- JavaScriptCore（书源 JS 规则引擎）
- SwiftSoup（HTML/CSS 解析）

## 主要功能（规划中）
- [ ] 书架（列表/网格/分组）
- [ ] 书源管理与规则引擎
- [ ] 在线搜书 / 发现
- [ ] 阅读器（多翻页模式 + 排版自定义）
- [ ] 本地 TXT / EPUB 阅读
- [ ] RSS 订阅
- [ ] 替换净化规则
- [ ] 书签 / 划线
- [ ] TTS 朗读

## 开发阶段
1. **Phase 1** 基础框架 + 数据层 + 书架 UI
2. **Phase 2** 书源解析引擎（CSS / XPath / JSONPath / JS）
3. **Phase 3** 阅读器
4. **Phase 4** 搜索 / 发现 / RSS
5. **Phase 5** 高级功能

## 书源兼容性
目标兼容 legado Android 书源格式（JSON），使用户可直接导入现有书源。
