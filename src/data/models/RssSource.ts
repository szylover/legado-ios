// RssSource.ts — matches legado Android RssSource.kt

export interface RssSource {
  sourceUrl: string;
  sourceName: string;
  sourceGroup?: string;
  sourceIcon?: string;
  sourceComment?: string;
  enabled: boolean;
  enabledCookieJar?: boolean;
  enableJs?: boolean;
  loadWithBaseUrl?: boolean;
  articleStyle?: number; // 0=RSS, 1=WebView
  concurrentRate?: string;
  header?: string;
  loginUrl?: string;
  loginUi?: string;
  loginCheckJs?: string;
  jsLib?: string;
  injectJs?: string;
  shouldOverrideUrlLoading?: string;
  sortUrl?: string;
  singleUrl: boolean;
  customOrder?: number;
  // Rules
  ruleArticles?: string;
  ruleNextPage?: string;
  ruleTitle?: string;
  rulePubDate?: string;
  ruleImage?: string;
  ruleLink?: string;
  ruleContent?: string;
  style?: string;
  webCss?: string;
  lastUpdateTime: number;
}
