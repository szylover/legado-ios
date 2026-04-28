import { db } from '../db';
import type { BookGroup } from '../entities/BookGroup';

export const BookGroupDao = {
  getAll: () => db.bookGroups.orderBy('order').toArray(),
  async upsert(group: BookGroup): Promise<void> { await db.bookGroups.put(group); },
  delete: (groupId: number) => db.bookGroups.delete(groupId),
};
