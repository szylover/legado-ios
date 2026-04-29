/**
 * BookExplore — 发现页探索
 * 对应 legado Android: webBook/BookList.kt (Explore 部分)
 */
import type { BookSource, ExploreRule } from '@/data/entities/BookSource';
import { AnalyzeUrl, type UrlContext } from '@/model/analyzeRule/AnalyzeUrl';
import { httpFetch } from '@/help/http/HttpClient';
import { AnalyzeRule } from '@/model/analyzeRule/AnalyzeRule';

export interface ExploreItem {
  name: string;
  author: string;
  bookUrl: string;
  coverUrl?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  wordCount?: string;
  originUrl: string;
  originName: string;
}

/**
 * Parse exploreUrl string into named explore categories.
 * Format: "分类名::url\n分类名2::url2" or single URL or JS
 */
export function parseExploreUrls(exploreUrl: string): Array<{ title: string; url: string }> {
  if (!exploreUrl?.trim()) return [];
  return exploreUrl
    .split(/\n|&&/)
    .map(line => {
      line = line.trim();
      if (!line) return null;
      const sepIdx = line.indexOf('::');
      if (sepIdx > 0) {
        return { title: line.slice(0, sepIdx).trim(), url: line.slice(sepIdx + 2).trim() };
      }
      return { title: '推荐', url: line };
    })
    .filter((x): x is { title: string; url: string } => x !== null);
}

export async function exploreBooks(
  source: BookSource,
  exploreUrl: string,
  page = 1,
): Promise<ExploreItem[]> {
  if (!source.ruleExplore) return [];
  const ctx: UrlContext = { baseUrl: source.bookSourceUrl, page };
  const parsed = new AnalyzeUrl(exploreUrl, ctx).parse();
  const resp = await httpFetch({
    ...parsed,
    sourceHeader: source.header,
    enableCookieJar: source.enabledCookieJar,
  });
  return parseExploreResults(resp.text, resp.url, source.ruleExplore, source);
}

function parseExploreResults(
  html: string,
  baseUrl: string,
  rule: ExploreRule,
  source: BookSource,
): ExploreItem[] {
  if (!rule.bookList) return [];
  const analyzer = new AnalyzeRule(html, baseUrl);
  const items = analyzer.getElements(rule.bookList);
  if (!items.length) return [];
  return items
    .map(itemHtml => {
      const a = new AnalyzeRule(itemHtml, baseUrl);
      const bookUrl = rule.bookUrl ? a.getString(rule.bookUrl) : '';
      return {
        name: rule.name ? a.getString(rule.name) : '',
        author: rule.author ? a.getString(rule.author) : '',
        bookUrl: bookUrl ? resolveUrl(bookUrl, baseUrl) : '',
        coverUrl: rule.coverUrl ? a.getString(rule.coverUrl) : undefined,
        intro: rule.intro ? a.getString(rule.intro) : undefined,
        kind: rule.kind ? a.getString(rule.kind) : undefined,
        lastChapter: rule.lastChapter ? a.getString(rule.lastChapter) : undefined,
        wordCount: rule.wordCount ? a.getString(rule.wordCount) : undefined,
        originUrl: source.bookSourceUrl,
        originName: source.bookSourceName,
      };
    })
    .filter(r => r.name && r.bookUrl);
}

function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}
