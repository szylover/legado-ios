/**
 * BookGroupDao
 */
import { getDatabase } from '../database/AppDatabase';
import { BookGroup } from '../models/BookGroup';

function rowToGroup(row: Record<string, unknown>): BookGroup {
  return {
    groupId: row.groupId as number,
    groupName: row.groupName as string,
    order: row.groupOrder as number,
    show: (row.show as number) === 1,
  };
}

export const BookGroupDao = {
  async getAll(): Promise<BookGroup[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM book_groups ORDER BY groupOrder ASC',
    );
    return rows.map(rowToGroup);
  },

  async upsert(group: BookGroup): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO book_groups (groupId, groupName, groupOrder, show)
       VALUES (?,?,?,?)`,
      [group.groupId, group.groupName, group.order, group.show ? 1 : 0],
    );
  },

  async delete(groupId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM book_groups WHERE groupId = ?', [groupId]);
  },
};
