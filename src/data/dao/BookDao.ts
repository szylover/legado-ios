/**
 * BookDao — 书籍数据访问层
 */

import { getDatabase } from '../database/AppDatabase';
import { Book } from '../models/Book';

function rowToBook(row: Record<string, unknown>): Book {
  return {
    bookUrl: row.bookUrl as string,
    tocUrl: (row.tocUrl as string) ?? '',
    origin: (row.origin as string) ?? '',
    originName: (row.originName as string) ?? '',
    name: (row.name as string) ?? '',
    author: (row.author as string) ?? '',
    kind: (row.kind as string) ?? undefined,
    customTag: (row.customTag as string) ?? undefined,
    coverUrl: (row.coverUrl as string) ?? undefined,
    customCoverUrl: (row.customCoverUrl as string) ?? undefined,
    intro: (row.intro as string) ?? undefined,
    customIntro: (row.customIntro as string) ?? undefined,
    charset: (row.charset as string) ?? undefined,
    type: (row.type as number) ?? 0,
    group: (row.bookGroup as number) ?? 0,
    latestChapterTitle: (row.latestChapterTitle as string) ?? undefined,
    latestChapterTime: (row.latestChapterTime as number) ?? 0,
    lastCheckTime: (row.lastCheckTime as number) ?? 0,
    lastCheckCount: (row.lastCheckCount as number) ?? 0,
    totalChapterNum: (row.totalChapterNum as number) ?? 0,
    scrollIndex: (row.scrollIndex as number) ?? 0,
    durChapterIndex: (row.durChapterIndex as number) ?? 0,
    durChapterPos: (row.durChapterPos as number) ?? 0,
    durChapterTime: (row.durChapterTime as number) ?? 0,
    wordCount: (row.wordCount as string) ?? undefined,
    canUpdate: (row.canUpdate as number) === 1,
    order: (row.bookOrder as number) ?? 0,
    useReplaceRule: row.useReplaceRule != null ? (row.useReplaceRule as number) === 1 : undefined,
    hasImageContent: row.hasImageContent != null ? (row.hasImageContent as number) === 1 : undefined,
    variable: (row.variable as string) ?? undefined,
  };
}

export const BookDao = {
  async getAll(): Promise<Book[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM books ORDER BY bookOrder ASC, name ASC',
    );
    return rows.map(rowToBook);
  },

  async getByGroup(groupId: number): Promise<Book[]> {
    const db = await getDatabase();
    let rows: Record<string, unknown>[];
    if (groupId === -1) {
      // 全部
      rows = await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM books ORDER BY bookOrder ASC',
      );
    } else if (groupId === -2) {
      // 本地
      rows = await db.getAllAsync<Record<string, unknown>>(
        "SELECT * FROM books WHERE origin = 'local' ORDER BY bookOrder ASC",
      );
    } else if (groupId === -3) {
      // 音频
      rows = await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM books WHERE type = 1 ORDER BY bookOrder ASC',
      );
    } else if (groupId === -4) {
      // 未分组
      rows = await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM books WHERE bookGroup = 0 ORDER BY bookOrder ASC',
      );
    } else {
      rows = await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM books WHERE (bookGroup & ?) != 0 ORDER BY bookOrder ASC',
        [groupId],
      );
    }
    return rows.map(rowToBook);
  },

  async getByUrl(url: string): Promise<Book | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM books WHERE bookUrl = ?',
      [url],
    );
    return row ? rowToBook(row) : null;
  },

  async upsert(book: Book): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO books
        (bookUrl, tocUrl, origin, originName, name, author, kind, customTag,
         coverUrl, customCoverUrl, intro, customIntro, charset, type, bookGroup,
         latestChapterTitle, latestChapterTime, lastCheckTime, lastCheckCount,
         totalChapterNum, scrollIndex, durChapterIndex, durChapterPos, durChapterTime,
         wordCount, canUpdate, bookOrder, useReplaceRule, hasImageContent, variable)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        book.bookUrl, book.tocUrl, book.origin, book.originName,
        book.name, book.author, book.kind ?? null, book.customTag ?? null,
        book.coverUrl ?? null, book.customCoverUrl ?? null,
        book.intro ?? null, book.customIntro ?? null, book.charset ?? null,
        book.type, book.group,
        book.latestChapterTitle ?? null, book.latestChapterTime,
        book.lastCheckTime, book.lastCheckCount, book.totalChapterNum,
        book.scrollIndex, book.durChapterIndex, book.durChapterPos, book.durChapterTime,
        book.wordCount ?? null, book.canUpdate ? 1 : 0, book.order,
        book.useReplaceRule != null ? (book.useReplaceRule ? 1 : 0) : null,
        book.hasImageContent != null ? (book.hasImageContent ? 1 : 0) : null,
        book.variable ?? null,
      ],
    );
  },

  async updateProgress(bookUrl: string, chapterIndex: number, chapterPos: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE books SET durChapterIndex = ?, durChapterPos = ?, durChapterTime = ? WHERE bookUrl = ?',
      [chapterIndex, chapterPos, Date.now(), bookUrl],
    );
  },

  async delete(bookUrl: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM books WHERE bookUrl = ?', [bookUrl]);
  },
};
