/**
 * RssParserByRule — 通过书源规则解析 RSS
 * 对应 legado Android: model/rss/RssParserByRule.kt
 *
 * 支持两种模式：
 *  1. singleUrl=true  → 整个 sourceUrl 就是单篇文章（直接渲染）
 *  2. singleUrl=false → 解析文章列表（ruleArticles + ruleTitle/ruleLink/...）
 *
 * 若没有自定义规则，则尝试标准 RSS/Atom XML 解析。
 */

import type { RssSource } from '@/data/entities/RssSource';
import type { RssArticle } from './Rss';
import { httpFetch } from '@/help/http/HttpClient';
import { AnalyzeRule } from '@/model/analyzeRule/AnalyzeRule';

// ── 工具 ────────────────────────────────────────────────────────────────────

function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  try { return new URL(url, base).href; } catch { return url; }
}

// ── 标准 RSS/Atom 解析（无自定义规则时的降级） ──────────────────────────────

function parseStandardFeed(xml: string, source: RssSource): RssArticle[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // RSS 2.0
    const items = Array.from(doc.querySelectorAll('item'));
    if (items.length) {
      return items.map(item => ({
        sourceUrl:   source.sourceUrl,
        title:       item.querySelector('title')?.textContent?.trim()       ?? '',
        link:        item.querySelector('link')?.textContent?.trim()        ?? '',
        pubDate:     item.querySelector('pubDate')?.textContent?.trim()     ?? '',
        description: item.querySelector('description')?.textContent?.trim() ?? '',
        image:       item.querySelector('enclosure')?.getAttribute('url')   ?? undefined,
      })).filter(a => a.title && a.link);
    }

    // Atom
    const entries = Array.from(doc.querySelectorAll('entry'));
    if (entries.length) {
      return entries.map(entry => ({
        sourceUrl: source.sourceUrl,
        title:     entry.querySelector('title')?.textContent?.trim()   ?? '',
        link:      entry.querySelector('link')?.getAttribute('href')   ?? '',
        pubDate:   (entry.querySelector('updated') ?? entry.querySelector('published'))
                     ?.textContent?.trim() ?? '',
        description: entry.querySelector('summary,content')?.textContent?.trim() ?? '',
      })).filter(a => a.title && a.link);
    }
  } catch { /* ignore parse errors */ }
  return [];
}

// ── 规则解析 ─────────────────────────────────────────────────────────────────

function parseByRule(html: string, baseUrl: string, source: RssSource): RssArticle[] {
  const analyzer = new AnalyzeRule(html, baseUrl);
  const listHtmls = source.ruleArticles
    ? analyzer.getStringList(source.ruleArticles)
    : [];

  if (!listHtmls.length) return [];

  return listHtmls.map(itemHtml => {
    const a = new AnalyzeRule(itemHtml, baseUrl);
    return {
      sourceUrl: source.sourceUrl,
      title:     source.ruleTitle   ? a.getString(source.ruleTitle)                         : '',
      link:      source.ruleLink    ? resolveUrl(a.getString(source.ruleLink), baseUrl)      : '',
      pubDate:   source.rulePubDate ? a.getString(source.rulePubDate)                       : undefined,
      image:     source.ruleImage   ? a.getString(source.ruleImage)                         : undefined,
      content:   source.ruleContent ? a.getString(source.ruleContent)                       : undefined,
    };
  }).filter(a => a.title && a.link);
}

// ── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 拉取 RSS 文章列表
 */
export async function fetchArticles(source: RssSource): Promise<RssArticle[]> {
  const resp = await httpFetch({
    url: source.sourceUrl,
    method: 'GET',
    headers: {},
    retry: 0,
    useWebView: false,
  });

  // 优先使用自定义规则
  if (source.ruleArticles) {
    const byRule = parseByRule(resp.text, resp.url, source);
    if (byRule.length) return byRule;
  }

  // 降级标准 RSS/Atom
  return parseStandardFeed(resp.text, source);
}
