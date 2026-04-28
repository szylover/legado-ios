import Dexie, { type Table } from 'dexie';
import type { BookSource } from './entities/BookSource';
import type { Book } from './entities/Book';
import type { BookChapter } from './entities/BookChapter';
import type { BookGroup } from './entities/BookGroup';
import type { RssSource } from './entities/RssSource';

class LegadoDB extends Dexie {
  bookSources!: Table<BookSource, string>;
  books!: Table<Book, string>;
  bookChapters!: Table<BookChapter & { id?: string }, string>;
  bookGroups!: Table<BookGroup, number>;
  rssSources!: Table<RssSource, string>;

  constructor() {
    super('legadoDB');
    this.version(1).stores({
      bookSources: 'bookSourceUrl, bookSourceName, bookSourceGroup, enabled, lastUpdateTime',
      books:       'bookUrl, name, author, origin, group',
      bookChapters: '[bookUrl+url], bookUrl, index',
      bookGroups:  '++groupId, groupName',
      rssSources:  'sourceUrl, sourceName, sourceGroup, enabled',
    });
  }
}

export const db = new LegadoDB();
