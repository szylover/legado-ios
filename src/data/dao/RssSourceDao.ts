import { db } from '../db';
import type { RssSource } from '../entities/RssSource';

export const RssSourceDao = {
  getAll: () => db.rssSources.orderBy('sourceName').toArray(),
  getEnabled: () => db.rssSources.filter(s => s.enabled !== false).toArray(),
  getByUrl: (url: string) => db.rssSources.get(url),
  async upsert(source: RssSource): Promise<void> { await db.rssSources.put(source); },
  async importMany(sources: RssSource[]): Promise<{ success: number; failed: number }> {
    try { await db.rssSources.bulkPut(sources); return { success: sources.length, failed: 0 }; }
    catch {
      let s = 0, f = 0;
      for (const r of sources) { try { await db.rssSources.put(r); s++; } catch { f++; } }
      return { success: s, failed: f };
    }
  },
  delete: (url: string) => db.rssSources.delete(url),
  bulkDelete: (urls: string[]) =>
    db.transaction('rw', db.rssSources, () => db.rssSources.bulkDelete(urls)),
  async setEnabled(url: string, enabled: boolean): Promise<void> {
    await db.rssSources.update(url, { enabled });
  },
};
