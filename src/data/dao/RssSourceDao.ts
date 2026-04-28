/**
 * RssSourceDao — CRUD for rss_sources table
 */

import { getDatabase } from '../database/AppDatabase';
import { RssSource } from '../models/RssSource';

function rowToSource(row: Record<string, unknown>): RssSource {
  return {
    sourceUrl: row.sourceUrl as string,
    sourceName: row.sourceName as string,
    sourceGroup: (row.sourceGroup as string) || undefined,
    sourceIcon: (row.sourceIcon as string) || undefined,
    sourceComment: (row.sourceComment as string) || undefined,
    enabled: (row.enabled as number) === 1,
    enabledCookieJar: row.enabledCookieJar != null ? (row.enabledCookieJar as number) === 1 : undefined,
    enableJs: row.enableJs != null ? (row.enableJs as number) === 1 : undefined,
    loadWithBaseUrl: row.loadWithBaseUrl != null ? (row.loadWithBaseUrl as number) === 1 : undefined,
    articleStyle: row.articleStyle as number,
    concurrentRate: (row.concurrentRate as string) || undefined,
    header: (row.header as string) || undefined,
    loginUrl: (row.loginUrl as string) || undefined,
    loginUi: (row.loginUi as string) || undefined,
    loginCheckJs: (row.loginCheckJs as string) || undefined,
    jsLib: (row.jsLib as string) || undefined,
    injectJs: (row.injectJs as string) || undefined,
    shouldOverrideUrlLoading: (row.shouldOverrideUrlLoading as string) || undefined,
    sortUrl: (row.sortUrl as string) || undefined,
    singleUrl: (row.singleUrl as number) === 1,
    customOrder: row.customOrder as number,
    ruleArticles: (row.ruleArticles as string) || undefined,
    ruleNextPage: (row.ruleNextPage as string) || undefined,
    ruleTitle: (row.ruleTitle as string) || undefined,
    rulePubDate: (row.rulePubDate as string) || undefined,
    ruleImage: (row.ruleImage as string) || undefined,
    ruleLink: (row.ruleLink as string) || undefined,
    ruleContent: (row.ruleContent as string) || undefined,
    style: (row.style as string) || undefined,
    webCss: (row.webCss as string) || undefined,
    lastUpdateTime: row.lastUpdateTime as number,
  };
}

export class RssSourceDao {
  static async getAll(): Promise<RssSource[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM rss_sources ORDER BY customOrder ASC, sourceName ASC'
    );
    return rows.map(rowToSource);
  }

  static async getEnabled(): Promise<RssSource[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM rss_sources WHERE enabled = 1 ORDER BY customOrder ASC, sourceName ASC'
    );
    return rows.map(rowToSource);
  }

  static async getByUrl(sourceUrl: string): Promise<RssSource | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM rss_sources WHERE sourceUrl = ?', [sourceUrl]
    );
    return row ? rowToSource(row) : null;
  }

  static async upsert(source: RssSource): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO rss_sources
        (sourceUrl, sourceName, sourceGroup, sourceIcon, sourceComment,
         enabled, enabledCookieJar, enableJs, loadWithBaseUrl, articleStyle,
         concurrentRate, header, loginUrl, loginUi, loginCheckJs, jsLib,
         injectJs, shouldOverrideUrlLoading, sortUrl, singleUrl, customOrder,
         ruleArticles, ruleNextPage, ruleTitle, rulePubDate, ruleImage,
         ruleLink, ruleContent, style, webCss, lastUpdateTime)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        source.sourceUrl, source.sourceName, source.sourceGroup ?? null,
        source.sourceIcon ?? null, source.sourceComment ?? null,
        source.enabled ? 1 : 0,
        source.enabledCookieJar != null ? (source.enabledCookieJar ? 1 : 0) : null,
        source.enableJs != null ? (source.enableJs ? 1 : 0) : null,
        source.loadWithBaseUrl != null ? (source.loadWithBaseUrl ? 1 : 0) : null,
        source.articleStyle ?? 0,
        source.concurrentRate ?? null, source.header ?? null,
        source.loginUrl ?? null, source.loginUi ?? null, source.loginCheckJs ?? null,
        source.jsLib ?? null, source.injectJs ?? null,
        source.shouldOverrideUrlLoading ?? null, source.sortUrl ?? null,
        source.singleUrl ? 1 : 0, source.customOrder ?? 0,
        source.ruleArticles ?? null, source.ruleNextPage ?? null,
        source.ruleTitle ?? null, source.rulePubDate ?? null,
        source.ruleImage ?? null, source.ruleLink ?? null,
        source.ruleContent ?? null, source.style ?? null, source.webCss ?? null,
        source.lastUpdateTime,
      ]
    );
  }

  static async importMany(sources: RssSource[]): Promise<void> {
    for (const s of sources) {
      await RssSourceDao.upsert(s);
    }
  }

  static async setEnabled(sourceUrl: string, enabled: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE rss_sources SET enabled = ? WHERE sourceUrl = ?', [enabled ? 1 : 0, sourceUrl]);
  }

  static async delete(sourceUrl: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM rss_sources WHERE sourceUrl = ?', [sourceUrl]);
  }

  static async count(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM rss_sources');
    return row?.cnt ?? 0;
  }
}
