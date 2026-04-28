import { db } from '../db';
import type { BookChapter } from '../entities/BookChapter';

export const BookChapterDao = {
  getByBook: (bookUrl: string) =>
    db.bookChapters.where('bookUrl').equals(bookUrl).sortBy('index'),

  async upsert(chapter: BookChapter): Promise<void> {
    await db.bookChapters.put(chapter);
  },

  async insertMany(chapters: BookChapter[]): Promise<void> {
    await db.bookChapters.bulkPut(chapters);
  },

  deleteByBook: (bookUrl: string) =>
    db.bookChapters.where('bookUrl').equals(bookUrl).delete(),
};
