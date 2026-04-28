import { db } from '../db';
import type { BookChapter } from '../entities/BookChapter';

export const BookChapterDao = {
  getByBook: (bookUrl: string) =>
    db.bookChapters.where('bookUrl').equals(bookUrl).sortBy('index'),

  async getOne(bookUrl: string, chapterUrl: string): Promise<BookChapter | undefined> {
    return db.bookChapters.get([bookUrl, chapterUrl]);
  },

  async upsert(chapter: BookChapter): Promise<void> {
    await db.bookChapters.put(chapter);
  },

  async insertMany(chapters: BookChapter[]): Promise<void> {
    await db.bookChapters.bulkPut(chapters);
  },

  async cacheContent(bookUrl: string, chapterUrl: string, content: string): Promise<void> {
    const ch = await db.bookChapters.get([bookUrl, chapterUrl]);
    if (ch) await db.bookChapters.put({ ...ch, cachedContent: content });
  },

  async countCached(bookUrl: string): Promise<number> {
    return db.bookChapters
      .where('bookUrl').equals(bookUrl)
      .filter(c => !!c.cachedContent)
      .count();
  },

  deleteByBook: (bookUrl: string) =>
    db.bookChapters.where('bookUrl').equals(bookUrl).delete(),
};
