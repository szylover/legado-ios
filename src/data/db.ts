import Dexie, { type Table } from 'dexie';
import type { BookSource } from './entities/BookSource';
import type { Book } from './entities/Book';
import type { BookChapter } from './entities/BookChapter';
import type { BookGroup } from './entities/BookGroup';
import type { RssSource } from './entities/RssSource';
import type { ReplaceRule } from './entities/ReplaceRule';
import type { Bookmark } from './entities/Bookmark';

class LegadoDB extends Dexie {
  bookSources!: Table<BookSource, string>;
  books!: Table<Book, string>;
  bookChapters!: Table<BookChapter & { id?: string }, string>;
  bookGroups!: Table<BookGroup, number>;
  rssSources!: Table<RssSource, string>;
  replaceRules!: Table<ReplaceRule, number>;
  bookmarks!: Table<Bookmark, number>;

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
    // v4: add replaceRules table
    this.version(4).stores({
      bookSources: 'bookSourceUrl, bookSourceName, bookSourceGroup, enabled, lastUpdateTime',
      books:       'bookUrl, name, author, origin, group, order',
      bookChapters: '[bookUrl+url], bookUrl, index',
      bookGroups:  '++groupId, groupName, order',
      rssSources:  'sourceUrl, sourceName, sourceGroup, enabled',
      replaceRules: '++id, name, group, enabled, order',
    });
    // v5: add bookmarks table
    this.version(5).stores({
      bookSources: 'bookSourceUrl, bookSourceName, bookSourceGroup, enabled, lastUpdateTime',
      books:       'bookUrl, name, author, origin, group, order',
      bookChapters: '[bookUrl+url], bookUrl, index',
      bookGroups:  '++groupId, groupName, order',
      rssSources:  'sourceUrl, sourceName, sourceGroup, enabled',
      replaceRules: '++id, name, group, enabled, order',
      bookmarks:   '++id, bookUrl, chapterIndex, time',
    });
  }
}

export const db = new LegadoDB();
