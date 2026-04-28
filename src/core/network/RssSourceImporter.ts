/**
 * RssSourceImporter — import/export RssSource JSON (legado Android format)
 */

import { RssSource } from '@/data/entities/RssSource';
import { RssSourceDao } from '@/data/dao/RssSourceDao';

export interface RssImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

/** Check if a parsed object looks like an RssSource (has sourceUrl + sourceName) */
export function isRssSource(obj: unknown): obj is Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o.sourceUrl === 'string' && typeof o.sourceName === 'string';
}

function normalize(raw: Record<string, unknown>): RssSource {
  return {
    sourceUrl: String(raw.sourceUrl),
    sourceName: String(raw.sourceName),
    sourceGroup: raw.sourceGroup != null ? String(raw.sourceGroup) : undefined,
    sourceIcon: raw.sourceIcon != null ? String(raw.sourceIcon) : undefined,
    sourceComment: raw.sourceComment != null ? String(raw.sourceComment) : undefined,
    enabled: raw.enabled !== false,
    enabledCookieJar: raw.enabledCookieJar != null ? Boolean(raw.enabledCookieJar) : undefined,
    enableJs: raw.enableJs != null ? Boolean(raw.enableJs) : undefined,
    loadWithBaseUrl: raw.loadWithBaseUrl != null ? Boolean(raw.loadWithBaseUrl) : undefined,
    articleStyle: typeof raw.articleStyle === 'number' ? raw.articleStyle : 0,
    concurrentRate: raw.concurrentRate != null ? String(raw.concurrentRate) : undefined,
    header: raw.header != null ? String(raw.header) : undefined,
    loginUrl: raw.loginUrl != null ? String(raw.loginUrl) : undefined,
    loginUi: raw.loginUi != null ? String(raw.loginUi) : undefined,
    loginCheckJs: raw.loginCheckJs != null ? String(raw.loginCheckJs) : undefined,
    jsLib: raw.jsLib != null ? String(raw.jsLib) : undefined,
    injectJs: raw.injectJs != null ? String(raw.injectJs) : undefined,
    shouldOverrideUrlLoading: raw.shouldOverrideUrlLoading != null ? String(raw.shouldOverrideUrlLoading) : undefined,
    sortUrl: raw.sortUrl != null ? String(raw.sortUrl) : undefined,
    singleUrl: Boolean(raw.singleUrl),
    customOrder: typeof raw.customOrder === 'number' ? raw.customOrder : 0,
    ruleArticles: raw.ruleArticles != null ? String(raw.ruleArticles) : undefined,
    ruleNextPage: raw.ruleNextPage != null ? String(raw.ruleNextPage) : undefined,
    ruleTitle: raw.ruleTitle != null ? String(raw.ruleTitle) : undefined,
    rulePubDate: raw.rulePubDate != null ? String(raw.rulePubDate) : undefined,
    ruleImage: raw.ruleImage != null ? String(raw.ruleImage) : undefined,
    ruleLink: raw.ruleLink != null ? String(raw.ruleLink) : undefined,
    ruleContent: raw.ruleContent != null ? String(raw.ruleContent) : undefined,
    style: raw.style != null ? String(raw.style) : undefined,
    webCss: raw.webCss != null ? String(raw.webCss) : undefined,
    lastUpdateTime: typeof raw.lastUpdateTime === 'number' ? raw.lastUpdateTime : Date.now(),
  };
}

export class RssSourceImporter {
  /** Parse JSON string and batch-import into DB */
  static async importFromJson(jsonText: string): Promise<RssImportResult> {
    const result: RssImportResult = { total: 0, success: 0, failed: 0, errors: [] };

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText.trim());
    } catch {
      result.errors.push('JSON 解析失败，请检查格式');
      return result;
    }

    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    result.total = items.length;

    const valid: RssSource[] = [];
    for (const item of items) {
      if (!isRssSource(item)) {
        result.failed++;
        result.errors.push(`无效订阅源: ${JSON.stringify(item).slice(0, 60)}`);
        continue;
      }
      try {
        valid.push(normalize(item as Record<string, unknown>));
      } catch (e) {
        result.failed++;
        result.errors.push(`解析失败: ${(e as Error).message}`);
      }
    }

    try {
      await RssSourceDao.importMany(valid);
      result.success = valid.length;
    } catch (e) {
      result.failed += valid.length;
      result.errors.push(`数据库写入失败: ${(e as Error).message}`);
    }

    return result;
  }

  /** Export all sources as JSON string */
  static async exportAll(): Promise<string> {
    const sources = await RssSourceDao.getAll();
    return JSON.stringify(sources, null, 2);
  }
}
