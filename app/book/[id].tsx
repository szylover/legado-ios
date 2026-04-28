/**
 * 书籍详情页 — T0052
 * 显示封面、简介、目录，支持加入书架和开始阅读
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Image, useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import { Book } from '@/data/models/Book';
import { BookChapter } from '@/data/models/BookChapter';
import { getBookInfo, getChapterList } from '@/core/network/WebBook';
import { BookmarkPlus, BookOpen, List } from 'lucide-react-native';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookUrl = decodeURIComponent(id ?? '');
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [inShelf, setInShelf] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingToc, setLoadingToc] = useState(false);

  useEffect(() => {
    BookDao.getByUrl(bookUrl).then((b) => {
      if (b) { setBook(b); setInShelf(true); }
    });
  }, [bookUrl]);

  useEffect(() => {
    if (!book) return;
    BookChapterDao.getByBook(book.bookUrl).then(setChapters);
  }, [book]);

  const fetchInfo = async () => {
    if (!book) return;
    const source = await BookSourceDao.getByUrl(book.origin);
    if (!source) return;
    setLoadingInfo(true);
    try {
      const info = await getBookInfo(source, book);
      const updated = { ...book, ...info };
      setBook(updated);
      if (inShelf) await BookDao.upsert(updated);
    } catch (e) {
      Alert.alert('获取失败', (e as Error).message);
    } finally {
      setLoadingInfo(false);
    }
  };

  const fetchToc = async () => {
    if (!book) return;
    const source = await BookSourceDao.getByUrl(book.origin);
    if (!source) return;
    setLoadingToc(true);
    try {
      const chs = await getChapterList(source, book);
      setChapters(chs);
      if (inShelf) {
        await BookChapterDao.deleteByBook(book.bookUrl);
        await BookChapterDao.upsertMany(chs);
        const updated = { ...book, totalChapterNum: chs.length, latestChapterTitle: chs[chs.length - 1]?.title };
        setBook(updated);
        await BookDao.upsert(updated);
      }
    } catch (e) {
      Alert.alert('获取目录失败', (e as Error).message);
    } finally {
      setLoadingToc(false);
    }
  };

  const addToShelf = async () => {
    if (!book) return;
    await BookDao.upsert(book);
    if (chapters.length) await BookChapterDao.upsertMany(chapters);
    setInShelf(true);
    Alert.alert('已加入书架');
  };

  const startReading = () => {
    if (!book) return;
    router.push(`/reader/${encodeURIComponent(book.bookUrl)}`);
  };

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color="#E8735A" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerTintColor: colors.text }} />

      {/* 封面 + 基本信息 */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverText}>{book.name.slice(0, 4)}</Text>
          </View>
        )}
        <View style={styles.headerMeta}>
          <Text style={[styles.bookName, { color: colors.text }]}>{book.name}</Text>
          <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>{book.author}</Text>
          <Text style={[styles.bookKind, { color: colors.textSecondary }]}>{book.kind ?? ''}</Text>
          <Text style={[styles.bookSource, { color: colors.textSecondary }]}>{book.originName}</Text>
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        {!inShelf ? (
          <Pressable style={styles.primaryBtn} onPress={addToShelf}>
            <BookmarkPlus size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>加入书架</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={startReading}>
            <BookOpen size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>开始阅读</Text>
          </Pressable>
        )}
        <Pressable style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={fetchToc}>
          {loadingToc ? <ActivityIndicator size="small" color="#E8735A" /> : <List size={18} color="#E8735A" />}
          <Text style={[styles.secondaryBtnText, { color: '#E8735A' }]}>获取目录</Text>
        </Pressable>
      </View>

      {/* 简介 */}
      <Pressable style={styles.section} onPress={fetchInfo}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>简介</Text>
          {loadingInfo && <ActivityIndicator size="small" color="#E8735A" />}
        </View>
        <Text style={[styles.intro, { color: colors.textSecondary }]} numberOfLines={5}>
          {book.intro ?? book.customIntro ?? '点击获取简介'}
        </Text>
      </Pressable>

      {/* 目录预览 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            目录 {chapters.length > 0 ? `(${chapters.length})` : ''}
          </Text>
        </View>
        {chapters.slice(0, 10).map((ch) => (
          <Pressable
            key={ch.url}
            style={[styles.chapterRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/reader/${encodeURIComponent(book.bookUrl)}?chapter=${ch.index}`)}
          >
            <Text style={[styles.chapterTitle, { color: colors.text }]} numberOfLines={1}>{ch.title}</Text>
          </Pressable>
        ))}
        {chapters.length > 10 && (
          <Text style={[styles.moreChapters, { color: colors.textSecondary }]}>
            还有 {chapters.length - 10} 章…
          </Text>
        )}
        {chapters.length === 0 && (
          <Text style={[styles.noChapters, { color: colors.textSecondary }]}>点击「获取目录」加载章节</Text>
        )}
      </View>
    </ScrollView>
  );
}

const LIGHT = { bg: '#FFF', text: '#222', textSecondary: '#888', border: '#EBEBEB', headerBg: '#F8F5F0' };
const DARK = { bg: '#1A1A1A', text: '#EEE', textSecondary: '#777', border: '#2E2E2E', headerBg: '#111' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', padding: 16, paddingTop: 80, gap: 16 },
  cover: { width: 100, height: 133, borderRadius: 6 },
  coverPlaceholder: { backgroundColor: '#C4B5A0', alignItems: 'center', justifyContent: 'center' },
  coverText: { color: '#FFF', fontSize: 14, fontWeight: '700', textAlign: 'center', padding: 8 },
  headerMeta: { flex: 1, gap: 6, justifyContent: 'flex-end' },
  bookName: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  bookAuthor: { fontSize: 14 },
  bookKind: { fontSize: 12 },
  bookSource: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8735A', borderRadius: 10, paddingVertical: 12, gap: 6 },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 12, gap: 6 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  section: { padding: 16, borderTopWidth: 8, borderTopColor: '#F5F5F5' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  intro: { fontSize: 14, lineHeight: 22 },
  chapterRow: { paddingVertical: 12, borderBottomWidth: 0.5 },
  chapterTitle: { fontSize: 14 },
  moreChapters: { fontSize: 13, paddingVertical: 8, textAlign: 'center' },
  noChapters: { fontSize: 13, paddingVertical: 8, textAlign: 'center' },
});
