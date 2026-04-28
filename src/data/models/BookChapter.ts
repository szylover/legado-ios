// BookChapter.ts — matches legado Android BookChapter.kt

export interface BookChapter {
  url: string;
  title: string;
  bookUrl: string;
  index: number;
  resourceUrl?: string;
  tag?: string;
  start?: number;
  end?: number;
  startFragmentId?: string;
  endFragmentId?: string;
  isVolume: boolean;
  isVip: boolean;
  isPay: boolean;
  updateTime?: string;
  variable?: string;
}
