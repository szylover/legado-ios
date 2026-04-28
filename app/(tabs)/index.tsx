/**
 * 书架主页
 * T0050 — BookshelfScreen
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useColorScheme, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { BookDao } from '@/data/dao/BookDao';
import { BookGroup, DEFAULT_GROUPS } from '@/data/entities/BookGroup';
import { BookGroupDao } from '@/data/dao/BookGroupDao';
import { Book } from '@/data/entities/Book';
import { BookCard } from '@/components/bookshelf/BookCard';
import { LayoutGrid, List, Plus } from 'lucide-react-native';

type ViewMode = 'grid' | 'list';

export default function BookshelfScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [books, setBooks] = useState<Book[]>([]);
  const [groups, setGroups] = useState<BookGroup[]>(DEFAULT_GROUPS);
  const [selectedGroup, setSelectedGroup] = useState<number>(-1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [refreshing, setRefreshing] = useState(false);

  const loadBooks = useCallback(async () => {
    const result = await BookDao.getByGroup(selectedGroup);
    setBooks(result);
  }, [selectedGroup]);

  const loadGroups = useCallback(async () => {
    try {
      const dbGroups = await BookGroupDao.getAll();
      setGroups(dbGroups.length ? dbGroups : DEFAULT_GROUPS);
    } catch {
      setGroups(DEFAULT_GROUPS);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  const numColumns = viewMode === 'grid' ? 3 : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 分组标签栏 */}
      <FlatList
        horizontal
        data={groups.filter((g) => g.show)}
        keyExtractor={(g) => String(g.groupId)}
        style={[styles.groupBar, { borderBottomColor: colors.border }]}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.groupTab,
              selectedGroup === item.groupId && { borderBottomColor: '#E8735A', borderBottomWidth: 2 },
            ]}
            onPress={() => setSelectedGroup(item.groupId)}
          >
            <Text
              style={[
                styles.groupTabText,
                { color: selectedGroup === item.groupId ? '#E8735A' : colors.textSecondary },
              ]}
            >
              {item.groupName}
            </Text>
          </Pressable>
        )}
      />

      {/* 工具栏 */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {books.length} 本
        </Text>
        <View style={styles.toolbarRight}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid'
              ? <List size={20} color={colors.textSecondary} />
              : <LayoutGrid size={20} color={colors.textSecondary} />}
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push('/booksource')}
          >
            <Plus size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* 书籍列表 */}
      {books.length === 0 ? (
        <EmptyShelf colors={colors} />
      ) : (
        <FlatList
          key={viewMode}
          data={books}
          numColumns={numColumns}
          keyExtractor={(b) => b.bookUrl}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              mode={viewMode}
              onPress={() => router.push(`/book/${encodeURIComponent(item.bookUrl)}`)}
              onLongPress={() => showBookMenu(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function EmptyShelf({ colors }: { colors: typeof LIGHT }) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>书架是空的</Text>
      <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
        点击右上角 + 导入书源，然后搜索添加书籍
      </Text>
    </View>
  );
}

function showBookMenu(book: Book) {
  Alert.alert(book.name, book.author, [
    { text: '取消', style: 'cancel' },
    {
      text: '从书架移除',
      style: 'destructive',
      onPress: async () => {
        await BookDao.delete(book.bookUrl);
      },
    },
  ]);
}

const LIGHT = {
  bg: '#F8F5F0',
  text: '#222',
  textSecondary: '#888',
  border: '#EBEBEB',
  card: '#FFF',
};
const DARK = {
  bg: '#1A1A1A',
  text: '#EEE',
  textSecondary: '#777',
  border: '#2E2E2E',
  card: '#242424',
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  groupBar: { maxHeight: 44, borderBottomWidth: 0.5 },
  groupTab: { paddingHorizontal: 16, paddingVertical: 10 },
  groupTabText: { fontSize: 14, fontWeight: '500' },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 0.5,
  },
  toolbarRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  countText: { fontSize: 12 },
  list: { padding: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyHint: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
