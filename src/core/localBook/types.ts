export interface ParsedLocalChapter {
  title: string;
  content: string;
  href?: string;
}

export interface ParsedLocalBook {
  name: string;
  author: string;
  coverUrl?: string;
  intro?: string;
  chapters: ParsedLocalChapter[];
}
