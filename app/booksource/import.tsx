/**
 * 书源/订阅源导入页面 — 支持 legado Android 书源 JSON 和订阅源 JSON
 */

import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  useColorScheme, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { BookSourceImporter, ImportResult } from '@/core/network/BookSourceImporter';
import { RssSourceImporter, RssImportResult } from '@/core/network/RssSourceImporter';
import { isRssSource } from '@/core/network/RssSourceImporter';

/** Test subscription source URL */
const TEST_RSS_URL = 'https://raw.githubusercontent.com/shidahuilang/shuyuan-bak/refs/heads/main/%E5%A4%A7%E7%81%B0%E7%8B%BC%E8%AE%A2%E9%98%85%E6%BA%90.json';

type Tab = 'file' | 'url' | 'paste';

interface AnyResult { total: number; success: number; failed: number; errors: string[] }

export default function BookSourceImportScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [tab, setTab] = useState<Tab>('url');
  const [url, setUrl] = useState(TEST_RSS_URL);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnyResult | null>(null);

  const handleImport = async (jsonText: string) => {
    setLoading(true);
    setResult(null);
    try {
      let res: AnyResult;
      // Auto-detect: check first item for sourceUrl (RssSource) vs bookSourceUrl (BookSource)
      let parsed: unknown;
      try { parsed = JSON.parse(jsonText.trim()); } catch { parsed = null; }
      const first = Array.isArray(parsed) ? parsed[0] : parsed;

      if (first && isRssSource(first)) {
        res = await RssSourceImporter.importFromJson(jsonText);
        if (res.success > 0) {
          Alert.alert('导入成功', `成功导入 ${res.success} 个订阅源`, [
            { text: '确定', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('导入失败', res.errors[0] ?? '无法解析订阅源 JSON');
        }
      } else {
        res = await BookSourceImporter.importFromJson(jsonText);
        if (res.success > 0) {
          Alert.alert('导入成功', `成功导入 ${res.success} 个书源`, [
            { text: '确定', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('导入失败', res.errors[0] ?? '无法解析书源 JSON');
        }
      }
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'] });
    if (res.canceled || !res.assets?.[0]) return;
    const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
    await handleImport(text);
  };

  const importFromUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(url.trim());
      const text = await resp.text();
      await handleImport(text);
    } catch (e) {
      Alert.alert('请求失败', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: true, headerTitle: '导入书源/订阅源', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }} />

      {/* Tab 切换 */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(['file', 'url', 'paste'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: tab === t ? '#E8735A' : colors.textSecondary }]}>
              {t === 'file' ? '本地文件' : t === 'url' ? '网络地址' : '粘贴文本'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.content}>
        {tab === 'file' && (
          <View style={styles.section}>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              支持导入 legado Android 导出的书源/订阅源 JSON 文件（自动识别格式）
            </Text>
            <Pressable style={styles.primaryBtn} onPress={pickFile} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>选择 JSON 文件</Text>}
            </Pressable>
          </View>
        )}

        {tab === 'url' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>订阅地址</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="https://..."
              placeholderTextColor={colors.textSecondary}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={[styles.testHint, { color: colors.textSecondary }]}>
              💡 已预填「大灰狼订阅源」测试地址，可直接导入
            </Text>
            <Pressable style={styles.primaryBtn} onPress={importFromUrl} disabled={loading || !url.trim()}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>导入</Text>}
            </Pressable>
          </View>
        )}

        {tab === 'paste' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>粘贴书源/订阅源 JSON</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder='[{"bookSourceName": "...", "bookSourceUrl": "..."}, ...]'
              placeholderTextColor={colors.textSecondary}
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.primaryBtn, !pasteText.trim() && { opacity: 0.4 }]}
              onPress={() => handleImport(pasteText)}
              disabled={loading || !pasteText.trim()}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>导入</Text>}
            </Pressable>
          </View>
        )}

        {result && (
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultText, { color: colors.text }]}>
              总计 {result.total} 个 · 成功 {result.success} 个 · 失败 {result.failed} 个
            </Text>
            {result.errors.slice(0, 3).map((e, i) => (
              <Text key={i} style={[styles.errorText, { color: '#E05C5C' }]}>{e}</Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const LIGHT = { bg: '#F5F5F5', text: '#222', textSecondary: '#888', card: '#FFF', border: '#EBEBEB' };
const DARK = { bg: '#111', text: '#EEE', textSecondary: '#666', card: '#1E1E1E', border: '#2E2E2E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#E8735A' },
  tabText: { fontSize: 14, fontWeight: '500' },
  content: { padding: 16 },
  section: { gap: 12 },
  hint: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 15, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, minHeight: 160, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#E8735A', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  testHint: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  resultBox: { marginTop: 16, padding: 16, borderRadius: 10, borderWidth: 0.5, gap: 6 },
  resultText: { fontSize: 14, fontWeight: '500' },
  errorText: { fontSize: 12 },
});
