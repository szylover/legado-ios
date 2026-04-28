import { db } from '../db';
import type { BookSource } from '../entities/BookSource';

export const BookSourceDao = {
  getAll: () => db.bookSources.orderBy('bookSourceName').toArray(),
  getEnabled: () => db.bookSources.filter(s => s.enabled).sortBy('weight'),
  getByUrl: (url: string) => db.bookSources.get(url),

  async upsert(source: BookSource): Promise<void> {
    await db.bookSources.put(source);
  },

  async importMany(sources: BookSource[]): Promise<{ success: number; failed: number }> {
    try {
      await db.bookSources.bulkPut(sources);
      return { success: sources.length, failed: 0 };
    } catch {
      let success = 0, failed = 0;
      for (const s of sources) {
        try { await db.bookSources.put(s); success++; } catch { failed++; }
      }
      return { success, failed };
    }
  },

  delete: (url: string) => db.bookSources.delete(url),

  async setEnabled(url: string, enabled: boolean): Promise<void> {
    await db.bookSources.update(url, { enabled });
  },

  count: () => db.bookSources.count(),
};
