/**
 * 订阅源管理 — list, enable/disable, delete RssSources
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useColorScheme, Switch, Alert, TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Trash2, Plus } from 'lucide-react-native';
import { RssSourceDao } from '@/data/dao/RssSourceDao';
import { RssSource } from '@/data/models/RssSource';

export default function RssSourceManagerScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [sources, setSources] = useState<RssSource[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await RssSourceDao.getAll();
      setSources(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = query
    ? sources.filter((s) => s.sourceName.includes(query) || (s.sourceGroup ?? '').includes(query))
    : sources;

  const toggleEnabled = async (s: RssSource) => {
    await RssSourceDao.setEnabled(s.sourceUrl, !s.enabled);
    setSources((prev) => prev.map((x) => x.sourceUrl === s.sourceUrl ? { ...x, enabled: !x.enabled } : x));
  };

  const deleteSource = (s: RssSource) => {
    Alert.alert('删除订阅源', `确定删除「${s.sourceName}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          await RssSourceDao.delete(s.sourceUrl);
          setSources((prev) => prev.filter((x) => x.sourceUrl !== s.sourceUrl));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '订阅源管理',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={() => router.push('/booksource/import')} style={{ marginRight: 16 }}>
              <Plus size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="搜索订阅源名称或分组"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <Text style={[styles.countText, { color: colors.textSecondary }]}>
        共 {sources.length} 个订阅源
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.sourceUrl}
        renderItem={({ item: s }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rowInfo}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{s.sourceName}</Text>
              {s.sourceGroup && (
                <Text style={[styles.group, { color: colors.textSecondary }]}>{s.sourceGroup}</Text>
              )}
              <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>{s.sourceUrl}</Text>
            </View>
            <Switch
              value={s.enabled}
              onValueChange={() => toggleEnabled(s)}
              thumbColor="#FFF"
              trackColor={{ true: '#E8735A', false: '#CCC' }}
            />
            <Pressable onPress={() => deleteSource(s)} style={{ marginLeft: 12 }}>
              <Trash2 size={18} color="#E05C5C" />
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
      />
    </View>
  );
}

const LIGHT = { bg: '#F5F5F5', text: '#222', textSecondary: '#888', card: '#FFF', border: '#EBEBEB' };
const DARK = { bg: '#111', text: '#EEE', textSecondary: '#666', card: '#1E1E1E', border: '#2E2E2E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { margin: 12, borderRadius: 10, borderWidth: 0.5, paddingHorizontal: 12 },
  searchInput: { fontSize: 14, paddingVertical: 10 },
  countText: { fontSize: 12, marginLeft: 16, marginBottom: 4 },
  list: { paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5 },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500' },
  group: { fontSize: 12 },
  url: { fontSize: 11 },
});
