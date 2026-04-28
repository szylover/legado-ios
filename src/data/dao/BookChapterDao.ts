/**
 * BookChapterDao — 章节数据访问层
 */

import { getDatabase } from '../AppDatabase';
import { BookChapter } from '../entities/BookChapter';

function rowToChapter(row: Record<string, unknown>): BookChapter {
  return {
    url: row.url as string,
    title: (row.title as string) ?? '',
    bookUrl: row.bookUrl as string,
    index: (row.idx as number) ?? 0,
    resourceUrl: (row.resourceUrl as string) ?? undefined,
    tag: (row.tag as string) ?? undefined,
    start: (row.start as number) ?? undefined,
    end: (row.end as number) ?? undefined,
    isVolume: (row.isVolume as number) === 1,
    isVip: (row.isVip as number) === 1,
    isPay: (row.isPay as number) === 1,
    updateTime: (row.updateTime as string) ?? undefined,
    variable: (row.variable as string) ?? undefined,
  };
}

export const BookChapterDao = {
  async getByBook(bookUrl: string): Promise<BookChapter[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM book_chapters WHERE bookUrl = ? ORDER BY idx ASC',
      [bookUrl],
    );
    return rows.map(rowToChapter);
  },

  async getByIndex(bookUrl: string, index: number): Promise<BookChapter | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM book_chapters WHERE bookUrl = ? AND idx = ?',
      [bookUrl, index],
    );
    return row ? rowToChapter(row) : null;
  },

  async upsertMany(chapters: BookChapter[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const ch of chapters) {
        await db.runAsync(
          `INSERT OR REPLACE INTO book_chapters
            (url, bookUrl, title, idx, resourceUrl, tag, start, end,
             isVolume, isVip, isPay, updateTime, variable)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            ch.url, ch.bookUrl, ch.title, ch.index,
            ch.resourceUrl ?? null, ch.tag ?? null,
            ch.start ?? null, ch.end ?? null,
            ch.isVolume ? 1 : 0, ch.isVip ? 1 : 0, ch.isPay ? 1 : 0,
            ch.updateTime ?? null, ch.variable ?? null,
          ],
        );
      }
    });
  },

  async deleteByBook(bookUrl: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM book_chapters WHERE bookUrl = ?', [bookUrl]);
  },

  async count(bookUrl: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM book_chapters WHERE bookUrl = ?',
      [bookUrl],
    );
    return row?.cnt ?? 0;
  },
};
