/**
 * 书源管理页面 — T0080
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Switch,
  useColorScheme, Alert, TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { BookSource } from '@/data/models/BookSource';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { Trash2, Plus, Search } from 'lucide-react-native';

export default function BookSourceScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [sources, setSources] = useState<BookSource[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const all = await BookSourceDao.getAll();
    setSources(all);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = query
    ? sources.filter(
        (s) =>
          s.bookSourceName.includes(query) ||
          s.bookSourceUrl.includes(query) ||
          (s.bookSourceGroup?.includes(query) ?? false),
      )
    : sources;

  const toggleEnabled = async (source: BookSource) => {
    await BookSourceDao.setEnabled(source.bookSourceUrl, !source.enabled);
    setSources((prev) =>
      prev.map((s) => s.bookSourceUrl === source.bookSourceUrl ? { ...s, enabled: !s.enabled } : s),
    );
  };

  const deleteSource = (source: BookSource) => {
    Alert.alert('删除书源', `确定删除「${source.bookSourceName}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          await BookSourceDao.delete(source.bookSourceUrl);
          setSources((prev) => prev.filter((s) => s.bookSourceUrl !== source.bookSourceUrl));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '书源管理',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={() => router.push('/booksource/import')} style={{ marginRight: 16 }}>
              <Plus size={22} color="#E8735A" />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="搜索书源名称/URL/分组"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <Text style={[styles.countText, { color: colors.textSecondary }]}>
        共 {sources.length} 个，启用 {sources.filter((s) => s.enabled).length} 个
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.bookSourceUrl}
        renderItem={({ item }) => (
          <SourceRow source={item} colors={colors}
            onToggle={() => toggleEnabled(item)} onDelete={() => deleteSource(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textSecondary }}>
              {query ? '无匹配书源' : '暂无书源，点击右上角 + 导入'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function SourceRow({ source, colors, onToggle, onDelete }: {
  source: BookSource; colors: typeof LIGHT; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.sourceName, { color: colors.text }]} numberOfLines={1}>{source.bookSourceName}</Text>
        <Text style={[styles.sourceUrl, { color: colors.textSecondary }]} numberOfLines={1}>
          {source.bookSourceGroup ? `${source.bookSourceGroup} · ` : ''}{source.bookSourceUrl}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Switch value={source.enabled} onValueChange={onToggle}
          trackColor={{ true: '#E8735A' }} thumbColor="#FFF" />
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Trash2 size={18} color="#E05C5C" />
        </Pressable>
      </View>
    </View>
  );
}

const LIGHT = { bg: '#F5F5F5', text: '#222', textSecondary: '#888', card: '#FFF', border: '#EBEBEB' };
const DARK = { bg: '#111', text: '#EEE', textSecondary: '#666', card: '#1E1E1E', border: '#2E2E2E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, padding: 10, borderRadius: 10, borderWidth: 0.5, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  countText: { fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  rowLeft: { flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceName: { fontSize: 15, fontWeight: '500' },
  sourceUrl: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  empty: { padding: 32, alignItems: 'center' },
});
