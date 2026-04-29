/**
 * BookChapterList — 获取目录
 * 对应 legado Android: webBook/BookChapterList.kt
 */

import type { BookSource, TocRule } from '@/data/entities/BookSource';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';
import { AnalyzeUrl, type UrlContext } from '@/model/analyzeRule/AnalyzeUrl';
import { httpFetch } from '@/help/http/HttpClient';
import { AnalyzeRule } from '@/model/analyzeRule/AnalyzeRule';

function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  try { return new URL(url, base).href; } catch { return url; }
}

export async function getChapterList(source: BookSource, book: Book): Promise<BookChapter[]> {
  const rule = source.ruleToc;
  if (!rule) return [];

  const ctx: UrlContext = {
    baseUrl: source.bookSourceUrl,
    source: { bookSourceUrl: source.bookSourceUrl, bookSourceName: source.bookSourceName },
  };

  const chapters: BookChapter[] = [];
  let tocUrl = book.tocUrl || book.bookUrl;
  let pageIndex = 0;

  while (tocUrl) {
    const parsed = new AnalyzeUrl(tocUrl, { ...ctx, baseUrl: tocUrl }).parse();
    const resp = await httpFetch({
      ...parsed,
      sourceHeader: source.header,
      enableCookieJar: source.enabledCookieJar,
    });

    const newChapters = parseToc(resp.text, resp.url, rule, book.bookUrl, pageIndex);
    chapters.push(...newChapters);
    pageIndex += newChapters.length;

    const nextTocUrl = rule.nextTocUrl
      ? new AnalyzeRule(resp.text, resp.url).getString(rule.nextTocUrl)
      : '';
    tocUrl = nextTocUrl && nextTocUrl !== tocUrl ? resolveUrl(nextTocUrl, resp.url) : '';
  }

  return chapters;
}

function parseToc(
  html: string,
  baseUrl: string,
  rule: TocRule,
  bookUrl: string,
  startIndex: number,
): BookChapter[] {
  if (!rule.chapterList) return [];
  const analyzer = new AnalyzeRule(html, baseUrl);
  const items = analyzer.getElements(rule.chapterList);

  return items.map((itemHtml, i) => {
    const a = new AnalyzeRule(itemHtml, baseUrl);
    return {
      bookUrl,
      index:      startIndex + i,
      title:      rule.chapterName ? a.getString(rule.chapterName) : `第${startIndex + i + 1}章`,
      url:        rule.chapterUrl  ? resolveUrl(a.getString(rule.chapterUrl), baseUrl) : '',
      isVolume:   rule.isVolume    ? a.getString(rule.isVolume) === 'true' : false,
      isVip:      rule.isVip       ? a.getString(rule.isVip) === 'true'    : false,
      isPay:      rule.isPay       ? a.getString(rule.isPay) === 'true'    : false,
      updateTime: rule.updateTime  ? a.getString(rule.updateTime)          : undefined,
    } satisfies BookChapter;
  }).filter(c => c.title && c.url);
}
