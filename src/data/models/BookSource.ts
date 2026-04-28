// BookSource model - 100% compatible with legado Android JSON format
// https://github.com/gedoor/legado

export interface SearchRule {
  bookList?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  bookUrl?: string;
  coverUrl?: string;
  wordCount?: string;
  checkKeyWord?: string;
}

export interface ExploreRule {
  bookList?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  bookUrl?: string;
  coverUrl?: string;
  wordCount?: string;
}

export interface BookInfoRule {
  init?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  coverUrl?: string;
  tocUrl?: string;
  wordCount?: string;
  canReName?: string;
  downloadUrls?: string;
}

export interface TocRule {
  chapterList?: string;
  chapterName?: string;
  chapterUrl?: string;
  isVolume?: string;
  isVip?: string;
  isPay?: string;
  updateTime?: string;
  nextTocUrl?: string;
}

export interface ContentRule {
  content?: string;
  nextContentUrl?: string;
  webJs?: string;
  sourceRegex?: string;
  replaceRegex?: string;
  imageStyle?: string;
  payAction?: string;
}

export interface BookSource {
  bookSourceUrl: string;
  bookSourceName: string;
  bookSourceGroup?: string;
  /** 0=text, 1=audio, 2=image, 3=file */
  bookSourceType: number;
  bookUrlPattern?: string;
  customOrder: number;
  enabled: boolean;
  enabledExplore: boolean;
  enabledCookieJar?: boolean;
  concurrentRate?: string;
  header?: string;
  loginUrl?: string;
  loginUi?: string;
  loginCheckJs?: string;
  coverDecodeJs?: string;
  jsLib?: string;
  bookSourceComment?: string;
  variableComment?: string;
  lastUpdateTime: number;
  respondTime: number;
  weight: number;
  exploreUrl?: string;
  exploreScreen?: string;
  searchUrl?: string;
  ruleExplore?: ExploreRule;
  ruleSearch?: SearchRule;
  ruleBookInfo?: BookInfoRule;
  ruleToc?: TocRule;
  ruleContent?: ContentRule;
}

export type BookSourceType = 0 | 1 | 2 | 3;
