/**
 * BookSourceDao — 书源数据访问层
 */

import { getDatabase } from '../AppDatabase';
import { BookSource } from '../entities/BookSource';

function rowToBookSource(row: Record<string, unknown>): BookSource {
  const parse = (v: unknown) => {
    if (!v || typeof v !== 'string') return undefined;
    try { return JSON.parse(v); } catch { return undefined; }
  };
  return {
    bookSourceUrl: row.bookSourceUrl as string,
    bookSourceName: row.bookSourceName as string,
    bookSourceGroup: (row.bookSourceGroup as string) ?? undefined,
    bookSourceType: (row.bookSourceType as number) ?? 0,
    bookUrlPattern: (row.bookUrlPattern as string) ?? undefined,
    customOrder: (row.customOrder as number) ?? 0,
    enabled: (row.enabled as number) === 1,
    enabledExplore: (row.enabledExplore as number) === 1,
    enabledCookieJar: row.enabledCookieJar != null ? (row.enabledCookieJar as number) === 1 : undefined,
    concurrentRate: (row.concurrentRate as string) ?? undefined,
    header: (row.header as string) ?? undefined,
    loginUrl: (row.loginUrl as string) ?? undefined,
    loginUi: (row.loginUi as string) ?? undefined,
    loginCheckJs: (row.loginCheckJs as string) ?? undefined,
    coverDecodeJs: (row.coverDecodeJs as string) ?? undefined,
    jsLib: (row.jsLib as string) ?? undefined,
    bookSourceComment: (row.bookSourceComment as string) ?? undefined,
    lastUpdateTime: (row.lastUpdateTime as number) ?? 0,
    respondTime: (row.respondTime as number) ?? 180000,
    weight: (row.weight as number) ?? 0,
    exploreUrl: (row.exploreUrl as string) ?? undefined,
    searchUrl: (row.searchUrl as string) ?? undefined,
    ruleExplore: parse(row.ruleExplore),
    ruleSearch: parse(row.ruleSearch),
    ruleBookInfo: parse(row.ruleBookInfo),
    ruleToc: parse(row.ruleToc),
    ruleContent: parse(row.ruleContent),
  };
}

export const BookSourceDao = {
  async getAll(): Promise<BookSource[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM book_sources ORDER BY customOrder ASC, bookSourceName ASC',
    );
    return rows.map(rowToBookSource);
  },

  async getEnabled(): Promise<BookSource[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM book_sources WHERE enabled = 1 ORDER BY weight DESC, customOrder ASC',
    );
    return rows.map(rowToBookSource);
  },

  async getByUrl(url: string): Promise<BookSource | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM book_sources WHERE bookSourceUrl = ?',
      [url],
    );
    return row ? rowToBookSource(row) : null;
  },

  async upsert(source: BookSource): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO book_sources
        (bookSourceUrl, bookSourceName, bookSourceGroup, bookSourceType,
         bookUrlPattern, customOrder, enabled, enabledExplore, enabledCookieJar,
         concurrentRate, header, loginUrl, loginUi, loginCheckJs, coverDecodeJs,
         jsLib, bookSourceComment, lastUpdateTime, respondTime, weight,
         exploreUrl, searchUrl, ruleExplore, ruleSearch, ruleBookInfo, ruleToc, ruleContent)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        source.bookSourceUrl,
        source.bookSourceName,
        source.bookSourceGroup ?? null,
        source.bookSourceType,
        source.bookUrlPattern ?? null,
        source.customOrder,
        source.enabled ? 1 : 0,
        source.enabledExplore ? 1 : 0,
        source.enabledCookieJar != null ? (source.enabledCookieJar ? 1 : 0) : null,
        source.concurrentRate ?? null,
        source.header ?? null,
        source.loginUrl ?? null,
        source.loginUi ?? null,
        source.loginCheckJs ?? null,
        source.coverDecodeJs ?? null,
        source.jsLib ?? null,
        source.bookSourceComment ?? null,
        source.lastUpdateTime,
        source.respondTime,
        source.weight,
        source.exploreUrl ?? null,
        source.searchUrl ?? null,
        source.ruleExplore ? JSON.stringify(source.ruleExplore) : null,
        source.ruleSearch ? JSON.stringify(source.ruleSearch) : null,
        source.ruleBookInfo ? JSON.stringify(source.ruleBookInfo) : null,
        source.ruleToc ? JSON.stringify(source.ruleToc) : null,
        source.ruleContent ? JSON.stringify(source.ruleContent) : null,
      ],
    );
  },

  /** 批量导入（书源 JSON 数组） */
  async importMany(sources: BookSource[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    for (const s of sources) {
      try {
        await BookSourceDao.upsert(s);
        success++;
      } catch {
        failed++;
      }
    }
    return { success, failed };
  },

  async delete(url: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM book_sources WHERE bookSourceUrl = ?', [url]);
  },

  async setEnabled(url: string, enabled: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE book_sources SET enabled = ? WHERE bookSourceUrl = ?',
      [enabled ? 1 : 0, url],
    );
  },
};
