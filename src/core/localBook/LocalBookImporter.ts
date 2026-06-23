import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';
import { parseEpub } from './EpubParser';
import { parseTxt } from './TxtParser';
import type { ParsedLocalBook } from './types';

export interface LocalBookImportResult {
  book: Book;
  chapters: BookChapter[];
}

async function parseLocalFile(file: File): Promise<ParsedLocalBook> {
  if (/\.epub$/i.test(file.name) || file.type === 'application/epub+zip') {
    return parseEpub(file);
  }
  return parseTxt(await file.text(), file.name);
}

export async function importLocalBook(file: File): Promise<LocalBookImportResult> {
  const parsed = await parseLocalFile(file);
  const now = Date.now();
  const bookUrl = `local://${parsed.name}_${now}`;

  const book: Book = {
    bookUrl,
    tocUrl: bookUrl,
    origin: 'local',
    originName: '本地书籍',
    name: parsed.name,
    author: parsed.author,
    coverUrl: parsed.coverUrl,
    intro: parsed.intro,
    type: 0,
    group: -2,
    latestChapterTitle: parsed.chapters[parsed.chapters.length - 1]?.title,
    latestChapterTime: now,
    lastCheckTime: now,
    lastCheckCount: 0,
    totalChapterNum: parsed.chapters.length,
    scrollIndex: 0,
    durChapterIndex: 0,
    durChapterPos: 0,
    durChapterTime: now,
    canUpdate: false,
    order: now,
  };

  const chapters: BookChapter[] = parsed.chapters.map((ch, i) => ({
    bookUrl,
    url: `${bookUrl}#${ch.href ?? i}`,
    index: i,
    title: ch.title,
    cachedContent: ch.content,
    resourceUrl: ch.href,
    isVolume: false,
    isVip: false,
    isPay: false,
  }));

  await BookDao.upsert(book);
  await BookChapterDao.insertMany(chapters);
  return { book, chapters };
}

export type { ParsedLocalBook, ParsedLocalChapter } from './types';
