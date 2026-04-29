import { db } from '../db';
import type { Bookmark } from '../entities/Bookmark';

export const BookmarkDao = {
  getByBook: (bookUrl: string) =>
    db.bookmarks.where('bookUrl').equals(bookUrl).sortBy('time'),

  getByChapter: (bookUrl: string, chapterIndex: number) =>
    db.bookmarks
      .where('[bookUrl+chapterIndex]')
      .equals([bookUrl, chapterIndex])
      .toArray()
      .catch(() =>
        db.bookmarks
          .filter(b => b.bookUrl === bookUrl && b.chapterIndex === chapterIndex)
          .toArray(),
      ),

  add: (bookmark: Omit<Bookmark, 'id'>) => db.bookmarks.add(bookmark as Bookmark),

  delete: (id: number) => db.bookmarks.delete(id),

  countByBook: (bookUrl: string) =>
    db.bookmarks.where('bookUrl').equals(bookUrl).count(),
};
