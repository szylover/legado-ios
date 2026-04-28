// Book.ts — matches legado Android Book.kt entity

export interface Book {
  bookUrl: string;
  tocUrl: string;
  /** 书源 URL，'local' 表示本地书籍 */
  origin: string;
  originName: string;
  name: string;
  author: string;
  kind?: string;
  customTag?: string;
  coverUrl?: string;
  customCoverUrl?: string;
  intro?: string;
  customIntro?: string;
  charset?: string;
  /** 0=文本 1=音频 2=图片 3=文件 */
  type: number;
  /** 书籍分组 bitmask */
  group: number;
  latestChapterTitle?: string;
  latestChapterTime: number;
  lastCheckTime: number;
  lastCheckCount: number;
  totalChapterNum: number;
  scrollIndex: number;
  durChapterIndex: number;
  durChapterPos: number;
  durChapterTime: number;
  wordCount?: string;
  canUpdate: boolean;
  order: number;
  useReplaceRule?: boolean;
  hasImageContent?: boolean;
  variable?: string;
}
