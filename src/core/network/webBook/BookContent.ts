/**
 * BookContent — 获取正文
 * 对应 legado Android: webBook/BookContent.kt
 */

import type { BookSource, ContentRule } from '@/data/entities/BookSource';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';
import { AnalyzeUrl, type UrlContext } from '@/model/analyzeRule/AnalyzeUrl';
import { httpFetch } from '@/help/http/HttpClient';
import { AnalyzeRule } from '@/model/analyzeRule/AnalyzeRule';

export async function getContent(
  source: BookSource,
  book: Book,
  chapter: BookChapter,
): Promise<string> {
  const rule = source.ruleContent;
  if (!rule) return '';

  const ctx: UrlContext = {
    baseUrl: source.bookSourceUrl,
    source: { bookSourceUrl: source.bookSourceUrl, bookSourceName: source.bookSourceName },
  };

  const parsed = new AnalyzeUrl(chapter.url, { ...ctx, baseUrl: chapter.url }).parse();
  const resp = await httpFetch({
    ...parsed,
    sourceHeader: source.header,
    enableCookieJar: source.enabledCookieJar,
  });

  return parseContent(resp.text, resp.url, rule);
}

function parseContent(html: string, baseUrl: string, rule: ContentRule): string {
  const analyzer = new AnalyzeRule(html, baseUrl);
  let content = rule.content ? analyzer.getString(rule.content) : '';

  if (rule.replaceRegex && content) {
    const parts = rule.replaceRegex.split('##');
    if (parts.length >= 2) {
      content = content.replace(new RegExp(parts[0], 'g'), parts[1] ?? '');
    }
  }

  return content.trim();
}
