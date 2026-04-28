/**
 * 设置页面
 */

import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, useColorScheme, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { BookOpen, Download, Trash2, Info, ChevronRight, Rss } from 'lucide-react-native';

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const sections: Section[] = [
    {
      title: '订阅管理',
      items: [
        {
          icon: <Rss size={20} color="#4CAF50" />,
          label: '订阅源列表',
          hint: '管理 RSS/番茄等订阅源',
          onPress: () => router.push('/rsssource'),
        },
        {
          icon: <Download size={20} color="#5B8AF0" />,
          label: '导入书源/订阅源',
          hint: '支持 legado Android JSON，自动识别格式',
          onPress: () => router.push('/booksource/import'),
        },
      ],
    },
    {
      title: '书源管理',
      items: [
        {
          icon: <BookOpen size={20} color="#E8735A" />,
          label: '书源列表',
          onPress: () => router.push('/booksource'),
        },
      ],
    },
    {
      title: '数据',
      items: [
        {
          icon: <Trash2 size={20} color="#E05C5C" />,
          label: '清除缓存',
          onPress: () =>
            Alert.alert('清除缓存', '确定清除所有章节缓存？', [
              { text: '取消', style: 'cancel' },
              { text: '清除', style: 'destructive', onPress: () => {} },
            ]),
        },
      ],
    },
    {
      title: '关于',
      items: [
        {
          icon: <Info size={20} color="#888" />,
          label: '关于 legado iOS',
          hint: '基于开源阅读 legado 复刻',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {section.items.map((item, i) => (
              <React.Fragment key={item.label}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                  onPress={item.onPress}
                >
                  <View style={styles.rowLeft}>
                    {item.icon}
                    <View style={styles.rowText}>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                      {item.hint && (
                        <Text style={[styles.rowHint, { color: colors.textSecondary }]}>{item.hint}</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </Pressable>
                {i < section.items.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

interface SettingItem {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onPress: () => void;
}
interface Section { title: string; items: SettingItem[] }

const LIGHT = { bg: '#F5F5F5', text: '#222', textSecondary: '#888', card: '#FFF', border: '#EBEBEB' };
const DARK = { bg: '#111', text: '#EEE', textSecondary: '#666', card: '#1E1E1E', border: '#2E2E2E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  card: { borderRadius: 12, overflow: 'hidden', borderWidth: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16 },
  rowHint: { fontSize: 12, marginTop: 2 },
  divider: { height: 0.5, marginLeft: 52 },
});
