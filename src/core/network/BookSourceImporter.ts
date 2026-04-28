/**
 * BookSourceImporter — 书源导入/导出
 * 支持从 legado Android 导出的 JSON 文件直接导入
 */

import { BookSource } from '../data/models/BookSource';
import { BookSourceDao } from '../data/dao/BookSourceDao';

/** 验证一个对象是否是合法的书源 */
function isValidBookSource(obj: unknown): obj is BookSource {
  if (!obj || typeof obj !== 'object') return false;
  const src = obj as Record<string, unknown>;
  return typeof src.bookSourceUrl === 'string' && src.bookSourceUrl.length > 0
    && typeof src.bookSourceName === 'string';
}

/** 规范化书源（补全默认值） */
function normalizeSource(raw: Record<string, unknown>): BookSource {
  return {
    bookSourceUrl: String(raw.bookSourceUrl ?? ''),
    bookSourceName: String(raw.bookSourceName ?? ''),
    bookSourceGroup: raw.bookSourceGroup ? String(raw.bookSourceGroup) : undefined,
    bookSourceType: Number(raw.bookSourceType ?? 0),
    bookUrlPattern: raw.bookUrlPattern ? String(raw.bookUrlPattern) : undefined,
    customOrder: Number(raw.customOrder ?? 0),
    enabled: raw.enabled !== false,
    enabledExplore: raw.enabledExplore !== false,
    enabledCookieJar: raw.enabledCookieJar != null ? Boolean(raw.enabledCookieJar) : undefined,
    concurrentRate: raw.concurrentRate ? String(raw.concurrentRate) : undefined,
    header: raw.header ? String(raw.header) : undefined,
    loginUrl: raw.loginUrl ? String(raw.loginUrl) : undefined,
    loginUi: raw.loginUi ? String(raw.loginUi) : undefined,
    loginCheckJs: raw.loginCheckJs ? String(raw.loginCheckJs) : undefined,
    coverDecodeJs: raw.coverDecodeJs ? String(raw.coverDecodeJs) : undefined,
    jsLib: raw.jsLib ? String(raw.jsLib) : undefined,
    bookSourceComment: raw.bookSourceComment ? String(raw.bookSourceComment) : undefined,
    lastUpdateTime: Number(raw.lastUpdateTime ?? Date.now()),
    respondTime: Number(raw.respondTime ?? 180000),
    weight: Number(raw.weight ?? 0),
    exploreUrl: raw.exploreUrl ? String(raw.exploreUrl) : undefined,
    searchUrl: raw.searchUrl ? String(raw.searchUrl) : undefined,
    ruleExplore: parseSubRule(raw.ruleExplore),
    ruleSearch: parseSubRule(raw.ruleSearch),
    ruleBookInfo: parseSubRule(raw.ruleBookInfo),
    ruleToc: parseSubRule(raw.ruleToc),
    ruleContent: parseSubRule(raw.ruleContent),
  };
}

function parseSubRule<T>(val: unknown): T | undefined {
  if (!val) return undefined;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return undefined; }
  }
  return undefined;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export const BookSourceImporter = {
  /**
   * 从 JSON 字符串导入书源
   * 支持单个对象或数组
   */
  async importFromJson(jsonText: string): Promise<ImportResult> {
    const result: ImportResult = { total: 0, success: 0, failed: 0, errors: [] };

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      result.errors.push(`JSON 解析失败: ${(e as Error).message}`);
      return result;
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    result.total = items.length;

    const valid: BookSource[] = [];
    for (const item of items) {
      if (isValidBookSource(item)) {
        valid.push(normalizeSource(item as Record<string, unknown>));
      } else {
        result.failed++;
        result.errors.push(`无效书源: ${JSON.stringify(item).slice(0, 60)}`);
      }
    }

    const dbResult = await BookSourceDao.importMany(valid);
    result.success = dbResult.success;
    result.failed += dbResult.failed;

    return result;
  },

  /** 导出所有书源为 JSON 字符串 */
  async exportAll(): Promise<string> {
    const sources = await BookSourceDao.getAll();
    return JSON.stringify(sources, null, 2);
  },

  /** 导出指定 URL 的书源 */
  async exportSelected(urls: string[]): Promise<string> {
    const all = await BookSourceDao.getAll();
    const selected = all.filter((s) => urls.includes(s.bookSourceUrl));
    return JSON.stringify(selected, null, 2);
  },
};
