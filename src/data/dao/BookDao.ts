import { db } from '../db';
import type { Book } from '../entities/Book';

export const BookDao = {
  getAll: () => db.books.orderBy('order').toArray(),
  getByUrl: (url: string) => db.books.get(url),

  async upsert(book: Book): Promise<void> {
    await db.books.put(book);
  },

  async updateProgress(bookUrl: string, chapterIndex: number, chapterPos: number): Promise<void> {
    await db.books.update(bookUrl, {
      durChapterIndex: chapterIndex,
      durChapterPos: chapterPos,
      durChapterTime: Date.now(),
    });
  },

  delete: (bookUrl: string) => db.books.delete(bookUrl),
};
