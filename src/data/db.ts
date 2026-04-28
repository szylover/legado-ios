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
    this.version(2).stores({
      bookSources: 'bookSourceUrl, bookSourceName, bookSourceGroup, enabled, lastUpdateTime',
      books:       'bookUrl, name, author, origin, group',
      bookChapters: '[bookUrl+url], bookUrl, index',
      bookGroups:  '++groupId, groupName',
      rssSources:  'sourceUrl, sourceName, sourceGroup, enabled',
    });
    // v3: add `order` index to books and bookGroups (required for orderBy('order'))
    this.version(3).stores({
      bookSources: 'bookSourceUrl, bookSourceName, bookSourceGroup, enabled, lastUpdateTime',
      books:       'bookUrl, name, author, origin, group, order',
      bookChapters: '[bookUrl+url], bookUrl, index',
      bookGroups:  '++groupId, groupName, order',
      rssSources:  'sourceUrl, sourceName, sourceGroup, enabled',
    });
  }
}

export const db = new LegadoDB();
