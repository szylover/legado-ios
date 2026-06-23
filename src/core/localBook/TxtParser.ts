import type { ParsedLocalBook } from './types';

const CHAPTER_RE = /^(第[零〇一二两三四五六七八九十百千万\d]+[章节卷集回部篇][\s\S]{0,40}|Chapter\s+\d+[\s\S]{0,40}|CHAPTER\s+\d+[\s\S]{0,40}|序章|楔子|引子|尾声|后记|番外[\s\S]{0,30})$/;

export function parseTxt(text: string, fileName: string): ParsedLocalBook {
  const name = fileName.replace(/\.txt$/i, '');
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  const chapterStarts: { idx: number; title: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length > 80) continue;
    if (CHAPTER_RE.test(line)) chapterStarts.push({ idx: i, title: line });
  }

  if (chapterStarts.length < 2) {
    chapterStarts.length = 0;
    chapterStarts.push({ idx: -1, title: name });
  }

  const chapters = chapterStarts.map((start, i) => {
    const contentStart = start.idx + 1;
    const contentEnd = chapterStarts[i + 1]?.idx ?? lines.length;
    return {
      title: start.title,
      content: lines.slice(contentStart, contentEnd).join('\n').trim(),
    };
  });

  return { name, author: '', chapters };
}
