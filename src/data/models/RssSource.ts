// RssSource.ts — matches legado Android RssSource.kt

export interface RssSource {
  sourceUrl: string;
  sourceName: string;
  sourceGroup?: string;
  sourceIcon?: string;
  enabled: boolean;
  enabledCookieJar?: boolean;
  concurrentRate?: string;
  header?: string;
  loginUrl?: string;
  loginUi?: string;
  loginCheckJs?: string;
  jsLib?: string;
  sortUrl?: string;
  singleUrl: boolean;
  articleList?: string;
  title?: string;
  author?: string;
  kind?: string;
  intro?: string;
  updateTime?: string;
  imgUrl?: string;
  link?: string;
  content?: string;
  style?: string;
  publishDate?: string;
  nextPageUrl?: string;
  webCss?: string;
  lastUpdateTime: number;
}
