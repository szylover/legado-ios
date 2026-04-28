/**
 * WebBook — 通过书源获取书籍信息、目录、正文
 * 对应 legado Android: webBook/ 下各 worker
 */

import { BookSource, SearchRule, BookInfoRule, TocRule, ContentRule } from '@/data/entities/BookSource';
import { Book } from '@/data/entities/Book';
import { BookChapter } from '@/data/entities/BookChapter';
import { AnalyzeUrl, UrlContext } from '@/model/analyzeRule/AnalyzeUrl';
import { httpFetch } from '@/help/http/HttpClient';
import { AnalyzeRule } from '@/model/analyzeRule/AnalyzeRule';

function makeJsCtx(source: BookSource, extra?: Record<string, unknown>): UrlContext {
  return {
    baseUrl: source.bookSourceUrl,
    source: { bookSourceUrl: source.bookSourceUrl, bookSourceName: source.bookSourceName },
    ...extra,
  };
}

// ─── 搜索 ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  name: string;
  author: string;
  bookUrl: string;
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

  const ctx = makeJsCtx(source, { key: keyword, page });
  const parsed = new AnalyzeUrl(source.searchUrl, ctx).parse();
  const resp = await httpFetch({
    ...parsed,
    sourceHeader: source.header,
    enableCookieJar: source.enabledCookieJar,
  });

  return parseSearchResults(resp.text, resp.url, source.ruleSearch);
}

function parseSearchResults(
  html: string,
  baseUrl: string,
  rule: SearchRule,
): SearchResult[] {
  if (!rule.bookList) return [];

  const analyzer = new AnalyzeRule(html, baseUrl);
  const bookListHtmls = analyzer.getStringList(rule.bookList);
  if (!bookListHtmls.length) return [];

  return bookListHtmls.map((itemHtml) => {
    const itemAnalyzer = new AnalyzeRule(itemHtml, baseUrl);
    return {
      name: rule.name ? itemAnalyzer.getString(rule.name) : '',
      author: rule.author ? itemAnalyzer.getString(rule.author) : '',
      bookUrl: rule.bookUrl ? resolveUrl(itemAnalyzer.getString(rule.bookUrl), baseUrl) : '',
      coverUrl: rule.coverUrl ? itemAnalyzer.getString(rule.coverUrl) : undefined,
      intro: rule.intro ? itemAnalyzer.getString(rule.intro) : undefined,
      kind: rule.kind ? itemAnalyzer.getString(rule.kind) : undefined,
      lastChapter: rule.lastChapter ? itemAnalyzer.getString(rule.lastChapter) : undefined,
      wordCount: rule.wordCount ? itemAnalyzer.getString(rule.wordCount) : undefined,
    };
  }).filter((r) => r.name && r.bookUrl);
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────────────

export async function getBookInfo(source: BookSource, book: Book): Promise<Partial<Book>> {
  const rule = source.ruleBookInfo;
  if (!rule) return {};

  const ctx = makeJsCtx(source, { baseUrl: book.bookUrl });

  // init 规则可以改变请求 URL
  const infoUrl = rule.init
    ? new AnalyzeUrl(rule.init, { ...ctx, result: book.bookUrl }).parse().url
    : book.bookUrl;

  const parsed = new AnalyzeUrl(infoUrl, ctx).parse();
  const resp = await httpFetch({
    ...parsed,
    sourceHeader: source.header,
    enableCookieJar: source.enabledCookieJar,
  });

  const analyzer = new AnalyzeRule(resp.text, resp.url);
  return {
    name: rule.name ? analyzer.getString(rule.name) || book.name : book.name,
    author: rule.author ? analyzer.getString(rule.author) || book.author : book.author,
    intro: rule.intro ? analyzer.getString(rule.intro) : book.intro,
    coverUrl: rule.coverUrl ? analyzer.getString(rule.coverUrl) : book.coverUrl,
    kind: rule.kind ? analyzer.getString(rule.kind) : book.kind,
    latestChapterTitle: rule.lastChapter ? analyzer.getString(rule.lastChapter) : undefined,
    wordCount: rule.wordCount ? analyzer.getString(rule.wordCount) : book.wordCount,
    tocUrl: rule.tocUrl ? resolveUrl(analyzer.getString(rule.tocUrl), resp.url) : book.tocUrl,
  };
}

// ─── 目录 ─────────────────────────────────────────────────────────────────────

export async function getChapterList(
  source: BookSource,
  book: Book,
): Promise<BookChapter[]> {
  const rule = source.ruleToc;
  if (!rule) return [];

  const ctx = makeJsCtx(source, { baseUrl: book.tocUrl || book.bookUrl });
  const chapters: BookChapter[] = [];
  let tocUrl = book.tocUrl || book.bookUrl;
  let pageIndex = 0;

  // 支持多页目录
  while (tocUrl) {
    const parsed = new AnalyzeUrl(tocUrl, ctx).parse();
    const resp = await httpFetch({
      ...parsed,
      sourceHeader: source.header,
      enableCookieJar: source.enabledCookieJar,
    });

    const newChapters = parseToc(resp.text, resp.url, rule, book.bookUrl, pageIndex);
    chapters.push(...newChapters);
    pageIndex += newChapters.length;

    // 下一页目录 URL
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
  const items = analyzer.getStringList(rule.chapterList);

  return items.map((itemHtml, i) => {
    const a = new AnalyzeRule(itemHtml, baseUrl);
    return {
      bookUrl,
      index: startIndex + i,
      title: rule.chapterName ? a.getString(rule.chapterName) : `第${startIndex + i + 1}章`,
      url: rule.chapterUrl ? resolveUrl(a.getString(rule.chapterUrl), baseUrl) : '',
      isVolume: rule.isVolume ? a.getString(rule.isVolume) === 'true' : false,
      isVip: rule.isVip ? a.getString(rule.isVip) === 'true' : false,
      isPay: rule.isPay ? a.getString(rule.isPay) === 'true' : false,
      updateTime: rule.updateTime ? a.getString(rule.updateTime) : undefined,
    } satisfies BookChapter;
  }).filter((c) => c.title && c.url);
}

// ─── 正文 ─────────────────────────────────────────────────────────────────────

export async function getContent(
  source: BookSource,
  book: Book,
  chapter: BookChapter,
): Promise<string> {
  const rule = source.ruleContent;
  if (!rule) return '';

  const ctx = makeJsCtx(source, { baseUrl: chapter.url });
  const parsed = new AnalyzeUrl(chapter.url, ctx).parse();
  const resp = await httpFetch({
    ...parsed,
    sourceHeader: source.header,
    enableCookieJar: source.enabledCookieJar,
  });

  return parseContent(resp.text, resp.url, rule, book, chapter);
}

function parseContent(
  html: string,
  baseUrl: string,
  rule: ContentRule,
  _book: Book,
  _chapter: BookChapter,
): string {
  const analyzer = new AnalyzeRule(html, baseUrl);
  let content = rule.content ? analyzer.getString(rule.content) : '';

  // 替换净化
  if (rule.replaceRegex && content) {
    const parts = rule.replaceRegex.split('##');
    if (parts.length >= 2) {
      const pattern = parts[0];
      const replacement = parts[1] ?? '';
      content = content.replace(new RegExp(pattern, 'g'), replacement);
    }
  }

  return content.trim();
}

// ─── 工具 ─────────────────────────────────────────────────────────────────────

function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}
