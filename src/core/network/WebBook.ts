/**
 * WebBook — re-export barrel
 * 各功能拆分到 webBook/ 子目录，对应 legado Android webBook/ 包结构
 */

export type { SearchResult } from './webBook/BookSearch';
export { searchBooks }       from './webBook/BookSearch';
export { getBookInfo }       from './webBook/BookInfo';
export { getChapterList }    from './webBook/BookChapterList';
export { getContent }        from './webBook/BookContent';
export type { ExploreItem }  from './webBook/BookExplore';
export { exploreBooks, parseExploreUrls } from './webBook/BookExplore';
