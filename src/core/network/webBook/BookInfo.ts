/**
 * BookInfo — 获取书籍详情
 * 对应 legado Android: webBook/BookInfo.kt
 */

import type { BookSource } from '@/data/entities/BookSource';
import type { Book } from '@/data/entities/Book';
import { AnalyzeUrl, type UrlContext } from '@/model/analyzeRule/AnalyzeUrl';
import { httpFetch } from '@/help/http/HttpClient';
import { AnalyzeRule } from '@/model/analyzeRule/AnalyzeRule';

function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  try { return new URL(url, base).href; } catch { return url; }
}

export async function getBookInfo(source: BookSource, book: Book): Promise<Partial<Book>> {
  const rule = source.ruleBookInfo;
  if (!rule) return {};

  const ctx: UrlContext = {
    baseUrl: source.bookSourceUrl,
    source: { bookSourceUrl: source.bookSourceUrl, bookSourceName: source.bookSourceName },
    result: book.bookUrl,
  };

  const infoUrl = rule.init
    ? new AnalyzeUrl(rule.init, ctx).parse().url
    : book.bookUrl;

  const parsed = new AnalyzeUrl(infoUrl, { ...ctx, baseUrl: infoUrl }).parse();
  const resp = await httpFetch({
    ...parsed,
    sourceHeader: source.header,
    enableCookieJar: source.enabledCookieJar,
  });

  const analyzer = new AnalyzeRule(resp.text, resp.url);
  return {
    name:               rule.name       ? analyzer.getString(rule.name)      || book.name   : book.name,
    author:             rule.author     ? analyzer.getString(rule.author)    || book.author : book.author,
    intro:              rule.intro      ? analyzer.getString(rule.intro)                    : book.intro,
    coverUrl:           rule.coverUrl   ? analyzer.getString(rule.coverUrl)                 : book.coverUrl,
    kind:               rule.kind       ? analyzer.getString(rule.kind)                     : book.kind,
    latestChapterTitle: rule.lastChapter? analyzer.getString(rule.lastChapter)              : undefined,
    wordCount:          rule.wordCount  ? analyzer.getString(rule.wordCount)                : book.wordCount,
    tocUrl:             rule.tocUrl     ? resolveUrl(analyzer.getString(rule.tocUrl), resp.url) : book.tocUrl,
  };
}
