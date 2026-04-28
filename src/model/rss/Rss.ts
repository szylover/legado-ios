// Rss.ts — RSS 文章数据模型
// 对应 legado Android: model/Rss.kt

export interface RssArticle {
  /** 来源 sourceUrl */
  sourceUrl: string;
  title: string;
  link: string;
  pubDate?: string;
  image?: string;
  /** 文章正文（规则解析后） */
  content?: string;
  description?: string;
}
