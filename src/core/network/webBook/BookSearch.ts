/**
 * BookSearch — 书源搜索
 * 对应 legado Android: webBook/BookSearch.kt
 */

import type { BookSource, SearchRule } from '@/data/entities/BookSource';
import { AnalyzeUrl, type UrlContext } from '@/model/analyzeRule/AnalyzeUrl';
import { httpFetch } from '@/help/http/HttpClient';
import { AnalyzeRule } from '@/model/analyzeRule/AnalyzeRule';

export interface SearchResult {
  name: string;
  author: string;
  bookUrl: string;
  /** 来源书源 URL */
  originUrl: string;
  originName: string;
  coverUrl?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  wordCount?: string;
}

export async function searchBooks(
  source: BookSource,
  keyword: string,
  page = 1,
): Promise<SearchResult[]> {
  if (!source.searchUrl || !source.ruleSearch) return [];

  const ctx: UrlContext = {
    baseUrl: source.bookSourceUrl,
    source: { bookSourceUrl: source.bookSourceUrl, bookSourceName: source.bookSourceName },
    key: keyword,
    page,
  };

  const parsed = new AnalyzeUrl(source.searchUrl, ctx).parse();

  const resp = await httpFetch({
    ...parsed,
    sourceHeader: source.header,
    enableCookieJar: source.enabledCookieJar,
  });

  return parseSearchResults(resp.text, resp.url, source.ruleSearch, source);
}

function parseSearchResults(
  html: string,
  baseUrl: string,
  rule: SearchRule,
  source: BookSource,
): SearchResult[] {
  if (!rule.bookList) return [];

  const analyzer = new AnalyzeRule(html, baseUrl);
  const bookListHtmls = analyzer.getElements(rule.bookList);
  if (!bookListHtmls.length) return [];

  const results = bookListHtmls.map((itemHtml) => {
    const a = new AnalyzeRule(itemHtml, baseUrl);
    const name    = rule.name    ? a.getString(rule.name)                         : '';
    const bookUrl = rule.bookUrl ? resolveUrl(a.getString(rule.bookUrl), baseUrl) : '';
    return {
      name,
      author:      rule.author    ? a.getString(rule.author)                        : '',
      bookUrl,
      originUrl:   source.bookSourceUrl,
      originName:  source.bookSourceName,
      coverUrl:    rule.coverUrl  ? a.getString(rule.coverUrl)                      : undefined,
      intro:       rule.intro     ? a.getString(rule.intro)                         : undefined,
      kind:        rule.kind      ? a.getString(rule.kind)                          : undefined,
      lastChapter: rule.lastChapter ? a.getString(rule.lastChapter)                 : undefined,
      wordCount:   rule.wordCount ? a.getString(rule.wordCount)                     : undefined,
    };
  }).filter(r => r.name && r.bookUrl);
  return results;
}

function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  try { return new URL(url, base).href; } catch { return url; }
}
