/**
 * BookCard — 书籍卡片组件（网格/列表模式）
 */

import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Image, useColorScheme, Dimensions,
} from 'react-native';
import { Book } from '@/data/models/Book';

interface Props {
  book: Book;
  mode: 'grid' | 'list';
  onPress: () => void;
  onLongPress: () => void;
}

const SCREEN_W = Dimensions.get('window').width;
const GRID_ITEM_W = (SCREEN_W - 8 * 2 - 8 * 2) / 3; // 3 columns, 8px padding
const COVER_RATIO = 4 / 3;

export function BookCard({ book, mode, onPress, onLongPress }: Props) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  if (mode === 'list') {
    return (
      <Pressable
        style={[styles.listItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <CoverImage uri={book.customCoverUrl ?? book.coverUrl} width={52} />
        <View style={styles.listMeta}>
          <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{book.name}</Text>
          <Text style={[styles.listAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
            {book.author}
          </Text>
          <Text style={[styles.listChapter, { color: colors.textSecondary }]} numberOfLines={1}>
            {book.latestChapterTitle ?? ''}
          </Text>
        </View>
        {book.lastCheckCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{book.lastCheckCount > 99 ? '99+' : book.lastCheckCount}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  // Grid mode
  return (
    <Pressable
      style={[styles.gridItem, { width: GRID_ITEM_W }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <CoverImage uri={book.customCoverUrl ?? book.coverUrl} width={GRID_ITEM_W} />
      {book.lastCheckCount > 0 && (
        <View style={styles.gridBadge}>
          <Text style={styles.badgeText}>{book.lastCheckCount > 99 ? '99+' : book.lastCheckCount}</Text>
        </View>
      )}
      <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={2}>
        {book.name}
      </Text>
    </Pressable>
  );
}

function CoverImage({ uri, width }: { uri?: string; width: number }) {
  const isDark = useColorScheme() === 'dark';
  const height = width * COVER_RATIO;
  const placeholder = isDark ? '#2E2E2E' : '#E8E0D8';

  if (!uri) {
    return <View style={[styles.cover, { width, height, backgroundColor: placeholder }]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.cover, { width, height }]}
      defaultSource={require('@/assets/images/cover-placeholder.png')}
    />
  );
}

const LIGHT = { card: '#FFF', text: '#222', textSecondary: '#888', border: '#EBEBEB' };
const DARK = { card: '#242424', text: '#EEE', textSecondary: '#777', border: '#2E2E2E' };

const styles = StyleSheet.create({
  // Grid
  gridItem: { margin: 4, marginBottom: 12 },
  gridTitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  gridBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#E8735A', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  // List
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, gap: 12,
  },
  listMeta: { flex: 1, gap: 3 },
  listTitle: { fontSize: 16, fontWeight: '500' },
  listAuthor: { fontSize: 13 },
  listChapter: { fontSize: 12 },
  // Shared
  cover: { borderRadius: 4, backgroundColor: '#DDD' },
  badge: {
    backgroundColor: '#E8735A', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
