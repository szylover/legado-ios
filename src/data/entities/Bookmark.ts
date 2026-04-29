export interface Bookmark {
  id?: number;          // auto-increment
  bookUrl: string;
  chapterIndex: number;
  chapterTitle: string;
  chapterUrl: string;
  content: string;      // excerpt (first ~80 chars of chapter content)
  note?: string;
  time: number;
}
