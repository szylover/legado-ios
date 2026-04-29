/**
 * BackupService — 全量备份/恢复
 * 备份内容：书源、书架、书籍分组、RSS 订阅（不含章节正文缓存）
 */

import { db } from '@/data/db';

export interface BackupData {
  version: 1;
  exportTime: number;
  bookSources: unknown[];
  books: unknown[];
  bookGroups: unknown[];
  rssSources: unknown[];
}

export async function exportBackup(): Promise<string> {
  const [bookSources, books, bookGroups, rssSources] = await Promise.all([
    db.bookSources.toArray(),
    db.books.toArray(),
    db.bookGroups.toArray(),
    db.rssSources.toArray(),
  ]);
  const data: BackupData = {
    version: 1,
    exportTime: Date.now(),
    bookSources,
    books,
    bookGroups,
    rssSources,
  };
  return JSON.stringify(data, null, 2);
}

export async function importBackup(json: string): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  let data: BackupData;
  try {
    data = JSON.parse(json) as BackupData;
  } catch {
    throw new Error('JSON 解析失败，文件可能已损坏');
  }

  if (!data.version || !Array.isArray(data.bookSources)) {
    throw new Error('备份格式不兼容');
  }

  const ops: Promise<unknown>[] = [];

  if (data.bookSources?.length) {
    ops.push(
      (db.bookSources.bulkPut(data.bookSources as Parameters<typeof db.bookSources.bulkPut>[0]) as Promise<unknown>)
        .then(() => { imported += data.bookSources.length; })
        .catch((e: Error) => errors.push(`书源: ${e.message}`)),
    );
  }
  if (data.books?.length) {
    ops.push(
      (db.books.bulkPut(data.books as Parameters<typeof db.books.bulkPut>[0]) as Promise<unknown>)
        .then(() => { imported += data.books.length; })
        .catch((e: Error) => errors.push(`书架: ${e.message}`)),
    );
  }
  if (data.bookGroups?.length) {
    ops.push(
      (db.bookGroups.bulkPut(data.bookGroups as Parameters<typeof db.bookGroups.bulkPut>[0]) as Promise<unknown>)
        .then(() => { imported += data.bookGroups.length; })
        .catch((e: Error) => errors.push(`分组: ${e.message}`)),
    );
  }
  if (data.rssSources?.length) {
    ops.push(
      (db.rssSources.bulkPut(data.rssSources as Parameters<typeof db.rssSources.bulkPut>[0]) as Promise<unknown>)
        .then(() => { imported += data.rssSources.length; })
        .catch((e: Error) => errors.push(`RSS: ${e.message}`)),
    );
  }

  await Promise.all(ops);
  return { imported, errors };
}
