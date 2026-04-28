# 设计文档：数据模型
任务：T0002  
日期：2026-04-28

## 概述

定义所有 TypeScript 数据接口，100% 对应 legado Android 的 JSON 导出格式，确保用户可直接导入 Android 书源/书籍数据。

## 数据模型

### BookSource（对应 `BookSource.kt`）

```typescript
interface BookSource {
  bookSourceUrl: string        // 主键
  bookSourceName: string
  bookSourceGroup?: string
  bookSourceType: 0|1|2|3      // 0=文本 1=音频 2=图片 3=文件
  bookUrlPattern?: string
  customOrder: number
  enabled: boolean
  enabledExplore: boolean
  enabledCookieJar?: boolean
  concurrentRate?: string
  header?: string
  loginUrl?: string
  loginUi?: string
  loginCheckJs?: string
  coverDecodeJs?: string
  jsLib?: string
  bookSourceComment?: string
  lastUpdateTime: number
  respondTime: number
  weight: number
  exploreUrl?: string
  searchUrl?: string
  ruleExplore?: ExploreRule
  ruleSearch?: SearchRule
  ruleBookInfo?: BookInfoRule
  ruleToc?: TocRule
  ruleContent?: ContentRule
}
```

### Book（对应 `Book.kt`）

```typescript
interface Book {
  bookUrl: string              // 主键
  tocUrl: string
  origin: string               // 书源 URL（'local' 表示本地书籍）
  originName: string
  name: string
  author: string
  kind?: string
  customTag?: string
  coverUrl?: string
  customCoverUrl?: string
  intro?: string
  customIntro?: string
  charset?: string
  type: number
  group: number
  latestChapterTitle?: string
  latestChapterTime: number
  lastCheckTime: number
  lastCheckCount: number
  totalChapterNum: number
  scrollIndex: number
  durChapterIndex: number
  durChapterPos: number
  durChapterTime: number
  wordCount?: string
  canUpdate: boolean
  order: number
  useReplaceRule?: boolean
  hasImageContent?: boolean
}
```

### BookChapter（对应 `BookChapter.kt`）

```typescript
interface BookChapter {
  url: string
  title: string
  bookUrl: string
  index: number
  resourceUrl?: string
  tag?: string
  start?: number
  end?: number
  startFragmentId?: string
  endFragmentId?: string
  isVolume: boolean
  isVip: boolean
  isPay: boolean
  updateTime?: string
  variable?: string
}
```

### ReplaceRule（对应 `ReplaceRule.kt`）

```typescript
interface ReplaceRule {
  id: number
  name: string
  group?: string
  pattern: string
  replacement: string
  isRegex: boolean
  scope?: string
  scopeTitle?: boolean
  scopeContent?: boolean
  timeoutMillisecond?: number
  enabled: boolean
  order: number
}
```

### BookGroup（对应 `BookGroup.kt`）

```typescript
interface BookGroup {
  groupId: number
  groupName: string
  order: number
  show: boolean
}
```

### ReadConfig（阅读配置）

```typescript
interface ReadConfig {
  id: number
  name: string
  bgStr?: string          // 背景颜色/图片
  bgStrNight?: string
  bgType: number          // 0=颜色 1=图片 2=渐变
  bgTypeNight: number
  textColor: string
  textColorNight: string
  textSize: number
  letterSpacing: number
  lineSpacingExtra: number
  paraSpacing: number
  fontPath?: string
  fontName?: string
  paddingLeft: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  pageAnim: number        // 0=覆盖 1=仿真 2=滑动 3=滚动 4=无动画
  pageAnimEInk: number
  titleSize: number
  titleAlign: number
}
```

## 实现方案（@Dev）

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/data/models/BookSource.ts` | BookSource + 子规则接口 |
| `src/data/models/Book.ts` | Book 接口 |
| `src/data/models/BookChapter.ts` | BookChapter 接口 |
| `src/data/models/ReplaceRule.ts` | ReplaceRule 接口 |
| `src/data/models/BookGroup.ts` | BookGroup 接口 |
| `src/data/models/ReadConfig.ts` | ReadConfig 接口 |
| `src/data/models/RssSource.ts` | RssSource 接口 |
| `src/data/models/index.ts` | 统一导出 |

## legado 兼容性

- 字段名与 legado Android JSON 导出完全一致（驼峰命名）
- `ruleSearch` 等子规则在 Android 存为 JSON string，iOS 同样支持两种形式（string 或 object）

## 验收标准

- [ ] 导入 legado Android 书源 JSON 文件不报错
- [ ] 所有字段类型与 legado 文档对应
