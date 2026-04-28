/**
 * 搜索页面 — T0031
 * 跨书源并行搜索，结果按书名/作者去重合并
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Image, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Search, X, BookOpen } from 'lucide-react-native';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { BookDao } from '@/data/dao/BookDao';
import { searchBooks, SearchBook } from '@/core/network/WebBook';

interface SearchResult extends SearchBook {
  sourceUrl: string;
  sourceName: string;
}

/** Group results by bookKey = `${name}::${author}` */
function dedup(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  for (const r of results) {
    const key = `${r.name}::${r.author ?? ''}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  return Array.from(seen.values());
}

export default function SearchScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceCount, setSourceCount] = useState(0);
  const [searchedCount, setSearchedCount] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef(false);

  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;
    abortRef.current = false;
    setLoading(true);
    setResults([]);
    setSearchedCount(0);

    const sources = await BookSourceDao.getEnabled();
    setSourceCount(sources.length);

    // Search all sources in parallel batches of 5
    const BATCH = 5;
    for (let i = 0; i < sources.length; i += BATCH) {
      if (abortRef.current) break;
      const batch = sources.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (source) => {
          if (abortRef.current) return;
          try {
            const books = await searchBooks(source, keyword, 1);
            if (abortRef.current) return;
            const tagged: SearchResult[] = books.map((b) => ({
              ...b,
              sourceUrl: source.bookSourceUrl,
              sourceName: source.bookSourceName,
            }));
            setResults((prev) => dedup([...prev, ...tagged]));
          } catch {
            // ignore per-source errors
          } finally {
            setSearchedCount((c) => c + 1);
          }
        })
      );
    }
    setLoading(false);
  }, []);

  const cancelSearch = () => {
    abortRef.current = true;
    setLoading(false);
  };

  const addToShelf = async (item: SearchResult) => {
    const existing = await BookDao.getByUrl(item.bookUrl ?? item.name);
    if (existing) {
      router.push(`/book/${encodeURIComponent(existing.bookUrl)}`);
      return;
    }
    router.push({
      pathname: '/book/[id]',
      params: { id: encodeURIComponent(item.bookUrl ?? item.name), fromSearch: '1' },
    });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setLoading(false);
    abortRef.current = true;
    inputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 顶部搜索栏 */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <X size={22} color={colors.text} />
        </Pressable>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.textSecondary} style={{ marginLeft: 10 }} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text }]}
            placeholder="搜书名、作者..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
            onSubmitEditing={() => doSearch(query)}
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} style={{ paddingHorizontal: 10 }}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.searchBtn, (!query.trim() || loading) && { opacity: 0.5 }]}
          onPress={loading ? cancelSearch : () => doSearch(query)}
          disabled={!query.trim() && !loading}
        >
          <Text style={styles.searchBtnText}>{loading ? '停止' : '搜索'}</Text>
        </Pressable>
      </View>

      {/* 搜索进度 */}
      {(loading || searchedCount > 0) && (
        <View style={[styles.progressBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ActivityIndicator size="small" color="#E8735A" animating={loading} />
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {loading
              ? `搜索中 ${searchedCount}/${sourceCount} 个书源，找到 ${results.length} 本`
              : `共搜索 ${searchedCount} 个书源，找到 ${results.length} 本`}
          </Text>
        </View>
      )}

      {/* 结果列表 */}
      <FlatList
        data={results}
        keyExtractor={(item, i) => `${item.bookUrl ?? item.name}-${i}`}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.resultRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            onPress={() => addToShelf(item)}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <BookOpen size={22} color="#CCC" />
              </View>
            )}
            <View style={styles.meta}>
              <Text style={[styles.bookName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.author ?? '未知作者'}
              </Text>
              {item.intro && (
                <Text style={[styles.bookIntro, { color: colors.textSecondary }]} numberOfLines={2}>{item.intro}</Text>
              )}
              <Text style={[styles.sourceTag, { color: '#E8735A' }]} numberOfLines={1}>{item.sourceName}</Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          !loading && query ? (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchedCount > 0 ? '未找到相关书籍' : '输入书名或作者开始搜索'}
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const LIGHT = { bg: '#F5F5F5', text: '#222', textSecondary: '#888', card: '#FFF', border: '#EBEBEB' };
const DARK  = { bg: '#111',    text: '#EEE', textSecondary: '#666', card: '#1E1E1E', border: '#2E2E2E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 52, paddingBottom: 10, paddingHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 6 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 0.5, height: 40,
  },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 8 },
  searchBtn: { backgroundColor: '#E8735A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  searchBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  progressBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 0.5,
  },
  progressText: { fontSize: 12 },
  resultRow: {
    flexDirection: 'row', padding: 14, borderBottomWidth: 0.5, gap: 12,
  },
  cover: { width: 60, height: 80, borderRadius: 6 },
  coverPlaceholder: { backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 4 },
  bookName: { fontSize: 16, fontWeight: '600' },
  bookAuthor: { fontSize: 13 },
  bookIntro: { fontSize: 12, lineHeight: 17 },
  sourceTag: { fontSize: 11, fontWeight: '500' },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15 },
});
