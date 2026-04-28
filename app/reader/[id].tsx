/**
 * 阅读器页面 — T0060
 * 基础实现：滚动模式 + 阅读设置面板
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, StatusBar, Dimensions, Modal,
  Slider,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { Book } from '@/data/models/Book';
import { BookChapter } from '@/data/models/BookChapter';
import { getContent } from '@/core/network/WebBook';
import { DEFAULT_READ_CONFIG, ReadConfig } from '@/data/models/ReadConfig';
import { Settings, ChevronLeft, ChevronRight, List } from 'lucide-react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ReaderScreen() {
  const { id, chapter: chapterParam } = useLocalSearchParams<{ id: string; chapter?: string }>();
  const bookUrl = decodeURIComponent(id ?? '');
  const isDark = useColorScheme() === 'dark';

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(Number(chapterParam ?? 0));
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<ReadConfig>(DEFAULT_READ_CONFIG);

  const scrollRef = useRef<ScrollView>(null);

  // 初始化
  useEffect(() => {
    BookDao.getByUrl(bookUrl).then((b) => {
      if (!b) return;
      setBook(b);
      const idx = Number(chapterParam ?? b.durChapterIndex ?? 0);
      setCurrentIndex(idx);
    });
    BookChapterDao.getByBook(bookUrl).then(setChapters);
  }, [bookUrl, chapterParam]);

  // 加载章节内容
  const loadContent = useCallback(async (index: number) => {
    if (!book || chapters.length === 0) return;
    const chapter = chapters[index];
    if (!chapter) return;

    setLoading(true);
    setContent('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    try {
      const source = await BookSourceDao.getByUrl(book.origin);
      if (!source) {
        setContent('无法找到书源，请检查书源是否存在。');
        return;
      }
      const text = await getContent(source, book, chapter);
      setContent(text || '（本章无内容）');
      // 更新阅读进度
      await BookDao.updateProgress(bookUrl, index, 0);
    } catch (e) {
      setContent(`加载失败：${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [book, chapters, bookUrl]);

  useEffect(() => {
    if (book && chapters.length > 0) {
      loadContent(currentIndex);
    }
  }, [book, chapters, currentIndex, loadContent]);

  const goChapter = (delta: number) => {
    const next = currentIndex + delta;
    if (next < 0 || next >= chapters.length) return;
    setCurrentIndex(next);
  };

  const bgColor = isDark ? config.bgStrNight ?? '#1A1A1A' : config.bgStr ?? '#FFF8F0';
  const textColor = isDark ? config.textColorNight : config.textColor;
  const chapter = chapters[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden={!showUI} />

      {/* 可点击遮罩层：点击中间显示/隐藏 UI */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowUI((v) => !v)}>
        {/* 内容 */}
        <ScrollView ref={scrollRef} style={styles.scroll} scrollEventThrottle={100}>
          {/* 章节标题 */}
          <Text style={[styles.chapterTitle, {
            color: textColor, fontSize: config.titleSize,
            paddingHorizontal: config.paddingLeft,
            paddingTop: config.paddingTop + (showUI ? 44 : 0),
            textAlign: config.titleAlign === 1 ? 'center' : 'left',
          }]}>
            {chapter?.title ?? ''}
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E8735A" />
            </View>
          ) : (
            <Text style={[styles.contentText, {
              color: textColor,
              fontSize: config.textSize,
              lineHeight: config.textSize + config.lineSpacingExtra,
              letterSpacing: config.letterSpacing,
              paddingHorizontal: config.paddingLeft,
              paddingBottom: config.paddingBottom,
            }]}>
              {formatContent(content, config.indent)}
            </Text>
          )}
        </ScrollView>
      </Pressable>

      {/* 顶部工具栏 */}
      {showUI && (
        <View style={[styles.topBar, { backgroundColor: bgColor + 'EE' }]}>
          <Pressable onPress={() => router.back()} style={styles.barBtn}>
            <ChevronLeft size={24} color={textColor} />
          </Pressable>
          <Text style={[styles.barTitle, { color: textColor }]} numberOfLines={1}>
            {book?.name ?? ''}
          </Text>
          <Pressable onPress={() => setShowSettings(true)} style={styles.barBtn}>
            <Settings size={22} color={textColor} />
          </Pressable>
        </View>
      )}

      {/* 底部翻页栏 */}
      {showUI && (
        <View style={[styles.bottomBar, { backgroundColor: bgColor + 'EE' }]}>
          <Pressable onPress={() => goChapter(-1)} disabled={currentIndex <= 0} style={styles.barBtn}>
            <ChevronLeft size={22} color={currentIndex <= 0 ? '#AAA' : textColor} />
          </Pressable>
          <Text style={[styles.barChapter, { color: textColor }]} numberOfLines={1}>
            {chapter?.title ?? `${currentIndex + 1}/${chapters.length}`}
          </Text>
          <Pressable onPress={() => goChapter(1)} disabled={currentIndex >= chapters.length - 1} style={styles.barBtn}>
            <ChevronRight size={22} color={currentIndex >= chapters.length - 1 ? '#AAA' : textColor} />
          </Pressable>
        </View>
      )}

      {/* 阅读设置面板 */}
      <SettingsPanel
        visible={showSettings}
        config={config}
        onChange={setConfig}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

function SettingsPanel({ visible, config, onChange, onClose }: {
  visible: boolean; config: ReadConfig;
  onChange: (c: ReadConfig) => void; onClose: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? '#222' : '#FFF';
  const text = isDark ? '#EEE' : '#333';

  const BG_OPTIONS = ['#FFF8F0', '#E8F5E9', '#F0F0F0', '#1A1A2E', '#FFFFFF'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.settingsPanel, { backgroundColor: bg }]}>
        <Text style={[styles.settingsTitle, { color: text }]}>阅读设置</Text>

        {/* 字号 */}
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: text }]}>字号 {config.textSize}</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => onChange({ ...config, textSize: Math.max(12, config.textSize - 1) })}>
              <Text style={styles.stepBtnText}>A-</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => onChange({ ...config, textSize: Math.min(32, config.textSize + 1) })}>
              <Text style={styles.stepBtnText}>A+</Text>
            </Pressable>
          </View>
        </View>

        {/* 行距 */}
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: text }]}>行距 {config.lineSpacingExtra}</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => onChange({ ...config, lineSpacingExtra: Math.max(4, config.lineSpacingExtra - 2) })}>
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => onChange({ ...config, lineSpacingExtra: Math.min(30, config.lineSpacingExtra + 2) })}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* 背景色 */}
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: text }]}>背景</Text>
          <View style={styles.bgOptions}>
            {BG_OPTIONS.map((c) => (
              <Pressable
                key={c}
                style={[styles.bgOption, { backgroundColor: c },
                  config.bgStr === c && styles.bgOptionActive]}
                onPress={() => onChange({ ...config, bgStr: c })}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatContent(text: string, indent: number): string {
  if (!text) return '';
  const pad = '\u3000'.repeat(indent); // 全角空格缩进
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => pad + line)
    .join('\n\n');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  chapterTitle: { fontWeight: '700', marginBottom: 24, lineHeight: 36 },
  contentText: { textAlign: 'justify' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 44, paddingBottom: 8, paddingHorizontal: 4,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 28, paddingTop: 8, paddingHorizontal: 4,
  },
  barBtn: { padding: 10 },
  barTitle: { flex: 1, fontSize: 16, fontWeight: '500', textAlign: 'center' },
  barChapter: { flex: 1, fontSize: 13, textAlign: 'center' },
  overlay: { flex: 1 },
  settingsPanel: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 20, paddingBottom: 40,
  },
  settingsTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel: { fontSize: 15 },
  stepper: { flexDirection: 'row', gap: 8 },
  stepBtn: { backgroundColor: '#E8735A', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  stepBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  bgOptions: { flexDirection: 'row', gap: 10 },
  bgOption: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#DDD' },
  bgOptionActive: { borderWidth: 3, borderColor: '#E8735A' },
});
