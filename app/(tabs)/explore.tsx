/**
 * 发现页面 — 通过书源 exploreUrl 规则抓取分类内容
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, useColorScheme, ActivityIndicator,
} from 'react-native';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { BookSource } from '@/data/models/BookSource';
import { AnalyzeUrl } from '@/core/network/AnalyzeUrl';
import { httpFetch } from '@/core/network/HttpClient';
import { AnalyzeRule } from '@/core/ruleEngine/AnalyzeRule';
import { router } from 'expo-router';

interface ExploreItem {
  name: string;
  bookUrl: string;
  coverUrl?: string;
  author?: string;
  kind?: string;
}

export default function ExploreScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [sources, setSources] = useState<BookSource[]>([]);
  const [selected, setSelected] = useState<BookSource | null>(null);
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    BookSourceDao.getEnabled().then((all) => {
      const withExplore = all.filter((s) => s.exploreUrl && s.enabledExplore);
      setSources(withExplore);
      if (withExplore.length) setSelected(withExplore[0]);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setItems([]);
    fetchExplore(selected)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 书源选择栏 */}
      <FlatList
        horizontal
        data={sources}
        keyExtractor={(s) => s.bookSourceUrl}
        style={[styles.sourceBar, { borderBottomColor: colors.border }]}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.sourceTab,
              selected?.bookSourceUrl === item.bookSourceUrl && styles.sourceTabActive,
            ]}
            onPress={() => setSelected(item)}
          >
            <Text
              style={[
                styles.sourceTabText,
                { color: selected?.bookSourceUrl === item.bookSourceUrl ? '#E8735A' : colors.textSecondary },
              ]}
            >
              {item.bookSourceName}
            </Text>
          </Pressable>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#E8735A" />
        </View>
      ) : items.length === 0 && !loading ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>
            {sources.length === 0 ? '请先添加支持发现的书源' : '暂无内容'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.bookUrl}
          numColumns={3}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.exploreItem}
              onPress={() => router.push(`/book/${encodeURIComponent(item.bookUrl)}`)}
            >
              <View style={[styles.exploreCover, { backgroundColor: colors.placeholder }]}>
                <Text style={styles.exploreCoverText} numberOfLines={3}>{item.name}</Text>
              </View>
              <Text style={[styles.exploreTitle, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              {item.author && (
                <Text style={[styles.exploreAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.author}
                </Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

async function fetchExplore(source: BookSource): Promise<ExploreItem[]> {
  if (!source.exploreUrl || !source.ruleExplore) return [];
  try {
    const parsed = new AnalyzeUrl(source.exploreUrl, { baseUrl: source.bookSourceUrl }).parse();
    const resp = await httpFetch({ ...parsed, sourceHeader: source.header });
    const analyzer = new AnalyzeRule(resp.text, resp.url);
    const rule = source.ruleExplore;
    if (!rule.bookList) return [];
    const items = analyzer.getStringList(rule.bookList);
    return items.map((html) => {
      const a = new AnalyzeRule(html, resp.url);
      return {
        name: rule.name ? a.getString(rule.name) : '',
        bookUrl: rule.bookUrl ? a.getString(rule.bookUrl) : '',
        coverUrl: rule.coverUrl ? a.getString(rule.coverUrl) : undefined,
        author: rule.author ? a.getString(rule.author) : undefined,
        kind: rule.kind ? a.getString(rule.kind) : undefined,
      };
    }).filter((i) => i.name && i.bookUrl);
  } catch {
    return [];
  }
}

const LIGHT = { bg: '#F8F5F0', text: '#222', textSecondary: '#888', border: '#EBEBEB', placeholder: '#E0D8D0' };
const DARK = { bg: '#1A1A1A', text: '#EEE', textSecondary: '#777', border: '#2E2E2E', placeholder: '#2E2E2E' };

const ITEM_W = (require('react-native').Dimensions.get('window').width - 32) / 3;

const styles = StyleSheet.create({
  container: { flex: 1 },
  sourceBar: { maxHeight: 44, borderBottomWidth: 0.5 },
  sourceTab: { paddingHorizontal: 14, paddingVertical: 10 },
  sourceTabActive: { borderBottomWidth: 2, borderBottomColor: '#E8735A' },
  sourceTabText: { fontSize: 13, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 8, gap: 8 },
  exploreItem: { width: ITEM_W, margin: 4 },
  exploreCover: {
    width: ITEM_W, height: ITEM_W * 1.33, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  exploreCoverText: { fontSize: 13, fontWeight: '600', color: '#666', textAlign: 'center' },
  exploreTitle: { fontSize: 13, marginTop: 4 },
  exploreAuthor: { fontSize: 11 },
});
