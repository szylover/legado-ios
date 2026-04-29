import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { ReplaceRuleDao } from '@/data/dao/ReplaceRuleDao';
import { BookmarkDao } from '@/data/dao/BookmarkDao';
import { getChapterList, getContent } from '@/core/network/WebBook';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';
import type { BookSource } from '@/data/entities/BookSource';
import type { ReplaceRule } from '@/data/entities/ReplaceRule';
import type { Bookmark } from '@/data/entities/Bookmark';

const LS_FONT_SIZE = 'reader_font_size';
const LS_LINE_HEIGHT = 'reader_line_height';
const LS_THEME = 'reader_theme';

function applyReplaceRules(text: string, rules: ReplaceRule[], origin: string): string {
  for (const rule of rules) {
    if (rule.scope) {
      const scopes = rule.scope.split(',').map(s => s.trim());
      if (!scopes.includes(origin)) continue;
    }
    try {
      if (rule.isRegex) {
        text = text.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
      } else {
        text = text.split(rule.pattern).join(rule.replacement);
      }
    } catch {
      // skip invalid regex
    }
  }
  return text;
}

const THEMES = [
  { key: 'dark',  bg: '#1a1a2e', text: '#e0e0e0', label: '深色' },
  { key: 'sepia', bg: '#f5efe0', text: '#3d2b1f', label: '护眼' },
  { key: 'light', bg: '#ffffff', text: '#1a1a1a', label: '白色' },
];

export default function Reader() {
  const { bookUrl } = useParams<{ bookUrl: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [source, setSource] = useState<BookSource | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [idx, setIdx] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [chapterBookmarked, setChapterBookmarked] = useState(false);

  // reader appearance settings
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem(LS_FONT_SIZE)) || 18);
  const [lineHeight, setLineHeight] = useState(() => Number(localStorage.getItem(LS_LINE_HEIGHT)) || 2);
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem(LS_THEME) || 'dark');

  // download state
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlTotal, setDlTotal] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const abortRef = useRef(false);
  const chapterListRef = useRef<HTMLDivElement>(null);

  const decoded = decodeURIComponent(bookUrl ?? '');
  const theme = THEMES.find(t => t.key === themeKey) ?? THEMES[0];

  useEffect(() => {
    const online = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!decoded) return;
    BookDao.getByUrl(decoded).then(b => {
      if (!b) return;
      setBook(b);
      // Check if a specific chapter was requested via query param
      const qChapter = searchParams.get('chapter');
      const startIdx = qChapter !== null ? Number(qChapter) : b.durChapterIndex;
      setIdx(startIdx);
      loadChapters(b);
      BookSourceDao.getByUrl(b.origin).then(s => setSource(s ?? null));
    });
  }, [decoded]);

  async function loadChapters(b: Book) {
    const cached = await BookChapterDao.getByBook(b.bookUrl);
    if (cached.length) {
      setChapters(cached);
      setCachedCount(await BookChapterDao.countCached(b.bookUrl));
      return;
    }
    const src = await BookSourceDao.getByUrl(b.origin);
    if (!src) return;
    const list = await getChapterList(src, b);
    await BookChapterDao.insertMany(list);
    setChapters(list);
    // Update total chapter count
    await BookDao.upsert({ ...b, totalChapterNum: list.length, latestChapterTitle: list[list.length - 1]?.title });
  }

  useEffect(() => {
    if (!chapters.length || !book) return;
    const ch = chapters[idx];
    if (!ch) return;
    if (ch.cachedContent) { setContent(ch.cachedContent); return; }
    if (offline) { setContent('📵 离线模式 — 该章节未缓存'); return; }
    setLoading(true);
    setContent('');
    BookSourceDao.getByUrl(book.origin).then(async src => {
      try {
        const rawText = src ? await getContent(src, book, ch) : '找不到书源';
        const enabledRules = await ReplaceRuleDao.getEnabled();
        const text = applyReplaceRules(rawText, enabledRules, book.origin);
        setContent(text);
        await BookChapterDao.cacheContent(book.bookUrl, ch.url, text);
        setCachedCount(c => c + 1);
      } catch (e) {
        setContent(`加载失败: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    });
    BookDao.updateProgress(book.bookUrl, idx, 0);
    // load bookmarks for current chapter
    BookmarkDao.getByChapter(book.bookUrl, idx).then(bms => {
      setChapterBookmarked(bms.length > 0);
    });
  }, [idx, chapters]);

  // Persist font settings
  useEffect(() => { localStorage.setItem(LS_FONT_SIZE, String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem(LS_LINE_HEIGHT, String(lineHeight)); }, [lineHeight]);
  useEffect(() => { localStorage.setItem(LS_THEME, themeKey); }, [themeKey]);

  // Scroll active chapter into view when chapter list opens
  useEffect(() => {
    if (showChapterList && chapterListRef.current) {
      const active = chapterListRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (active) active.scrollIntoView({ block: 'center' });
    }
  }, [showChapterList]);

  async function downloadAll() {
    if (!book || !source || downloading) return;
    abortRef.current = false;
    setDownloading(true);
    const uncached = chapters.filter(c => !c.cachedContent);
    setDlTotal(uncached.length);
    setDlProgress(0);
    let done = 0;
    for (const ch of uncached) {
      if (abortRef.current) break;
      try {
        const text = await getContent(source, book, ch);
        await BookChapterDao.cacheContent(book.bookUrl, ch.url, text);
        done++;
        setDlProgress(done);
        setCachedCount(c => c + 1);
        await new Promise(r => setTimeout(r, 200));
      } catch { /* skip failed */ }
    }
    setDownloading(false);
  }

  const jumpToChapter = useCallback((i: number) => {
    setIdx(i);
    setShowChapterList(false);
    setShowBookmarks(false);
    setShowCtrl(false);
  }, []);

  const toggleBookmark = useCallback(async () => {
    if (!book || !chapters[idx]) return;
    const ch = chapters[idx];
    if (chapterBookmarked) {
      const bms = await BookmarkDao.getByChapter(book.bookUrl, idx);
      await Promise.all(bms.map(b => b.id != null ? BookmarkDao.delete(b.id) : Promise.resolve()));
      setChapterBookmarked(false);
    } else {
      const excerpt = content.replace(/\s+/g, ' ').slice(0, 80);
      await BookmarkDao.add({
        bookUrl: book.bookUrl,
        chapterIndex: idx,
        chapterTitle: ch.title,
        chapterUrl: ch.url,
        content: excerpt,
        time: Date.now(),
      });
      setChapterBookmarked(true);
    }
  }, [book, chapters, idx, content, chapterBookmarked]);

  const openBookmarks = useCallback(async () => {
    if (!book) return;
    const bms = await BookmarkDao.getByBook(book.bookUrl);
    setBookmarks(bms);
    setShowBookmarks(true);
    setShowChapterList(false);
    setShowSettings(false);
  }, [book]);

  const downloadedPct = chapters.length ? Math.round((cachedCount / chapters.length) * 100) : 0;

  return (
    <div className="reader-wrap" style={{ background: theme.bg, color: theme.text }}>
      {showCtrl && (
        <div className="reader-hdr">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', flexShrink: 0 }}>← 返回</button>
          <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{book?.name}</h2>
          {offline && <span style={{ fontSize: 11, color: '#f90', flexShrink: 0 }}>离线</span>}
          <button
            onClick={e => { e.stopPropagation(); setShowChapterList(v => !v); setShowSettings(false); setShowBookmarks(false); }}
            style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}
          >目录</button>
          <button
            onClick={e => { e.stopPropagation(); toggleBookmark(); }}
            style={{ color: chapterBookmarked ? '#f5c518' : 'var(--accent)', fontSize: 16, flexShrink: 0 }}
            title={chapterBookmarked ? '取消书签' : '添加书签'}
          >{chapterBookmarked ? '🔖' : '📑'}</button>
          <button
            onClick={e => { e.stopPropagation(); openBookmarks(); }}
            style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}
          >书签</button>
          <button
            onClick={e => { e.stopPropagation(); setShowSettings(v => !v); setShowChapterList(false); setShowBookmarks(false); }}
            style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}
          >Aa</button>
        </div>
      )}

      <div
        className="reader-body"
        style={{ fontSize, lineHeight, color: theme.text, background: theme.bg }}
        onClick={() => { if (!showChapterList && !showSettings && !showBookmarks) setShowCtrl(v => !v); }}
      >
        {loading
          ? <div style={{ color: 'var(--text2)', textAlign: 'center', marginTop: 40 }}>加载中…</div>
          : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</div>
        }
      </div>

      {/* Chapter list drawer */}
      {showChapterList && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 300, display: 'flex',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setShowChapterList(false)}
        >
          <div
            ref={chapterListRef}
            style={{
              width: '75%', maxWidth: 320, height: '100%',
              background: 'var(--bg2)', overflowY: 'auto',
              padding: '52px 0 20px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '0 16px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              目录 <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({chapters.length}章)</span>
            </div>
            {chapters.map((ch, i) => (
              <div
                key={ch.url}
                data-active={i === idx ? 'true' : 'false'}
                onClick={() => jumpToChapter(i)}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  color: i === idx ? 'var(--accent)' : 'var(--text)',
                  background: i === idx ? 'rgba(79,195,247,0.08)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {i === idx && <span style={{ fontSize: 9 }}>▶</span>}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                {ch.cachedContent && <span style={{ fontSize: 10, color: 'var(--success)' }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookmarks drawer */}
      {showBookmarks && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 300, display: 'flex',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setShowBookmarks(false)}
        >
          <div
            style={{
              width: '75%', maxWidth: 320, height: '100%',
              background: 'var(--bg2)', overflowY: 'auto',
              padding: '52px 0 20px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '0 16px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              书签 <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({bookmarks.length})</span>
            </div>
            {bookmarks.length === 0 ? (
              <div style={{ padding: '24px 16px', color: 'var(--text2)', fontSize: 13, textAlign: 'center' }}>
                暂无书签<br />点击阅读器顶部「📑」添加
              </div>
            ) : bookmarks.map(bm => (
              <div
                key={bm.id}
                onClick={() => jumpToChapter(bm.chapterIndex)}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  color: bm.chapterIndex === idx ? 'var(--accent)' : 'var(--text)',
                  background: bm.chapterIndex === idx ? 'rgba(79,195,247,0.08)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🔖 {bm.chapterTitle}
                  </span>
                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      if (bm.id != null) {
                        await BookmarkDao.delete(bm.id);
                        setBookmarks(prev => prev.filter(b => b.id !== bm.id));
                        if (bm.chapterIndex === idx) setChapterBookmarked(false);
                      }
                    }}
                    style={{ fontSize: 11, color: 'var(--danger)', flexShrink: 0 }}
                  >删除</button>
                </div>
                {bm.content && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {bm.content}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3 }}>
                  {new Date(bm.time).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Font / theme settings panel */}
      {showSettings && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{ background: 'var(--bg2)', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>阅读设置</div>

            {/* Font size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 60 }}>字体大小</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setFontSize(v => Math.max(12, v - 1))}>A-</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 14, color: 'var(--text)' }}>{fontSize}px</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setFontSize(v => Math.min(30, v + 1))}>A+</button>
            </div>

            {/* Line height */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 60 }}>行距</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setLineHeight(v => Math.max(1.2, parseFloat((v - 0.1).toFixed(1))))}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 14, color: 'var(--text)' }}>{lineHeight.toFixed(1)}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setLineHeight(v => Math.min(3, parseFloat((v + 0.1).toFixed(1))))}>+</button>
            </div>

            {/* Theme */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 60 }}>背景</span>
              <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setThemeKey(t.key)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12,
                      background: t.bg, color: t.text,
                      border: t.key === themeKey ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCtrl && chapters.length > 0 && (
        <div className="reader-footer" style={{ flexDirection: 'column', gap: 6, padding: '8px 12px' }}>
          {/* Download progress */}
          {downloading && (
            <div style={{ width: '100%', fontSize: 12, color: 'var(--text2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span>下载缓存中 {dlProgress}/{dlTotal}</span>
                <button style={{ fontSize: 11, color: '#f44' }} onClick={() => { abortRef.current = true; }}>停止</button>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 3, height: 4 }}>
                <div style={{ background: 'var(--accent)', width: `${dlTotal ? (dlProgress / dlTotal * 100) : 0}%`, height: '100%', borderRadius: 3, transition: 'width .3s' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <button className="btn btn-ghost btn-sm" disabled={idx <= 0} onClick={() => setIdx(i => i - 1)}>上一章</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chapters[idx]?.title}
            </div>
            <button className="btn btn-ghost btn-sm" disabled={idx >= chapters.length - 1} onClick={() => setIdx(i => i + 1)}>下一章</button>
          </div>
          {!downloading && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', fontSize: 12 }}
              onClick={downloadAll}
              disabled={cachedCount >= chapters.length}
            >
              {cachedCount >= chapters.length
                ? `✅ 全书已缓存 (${chapters.length}章)`
                : `⬇️ 离线下载全书 (已缓存 ${downloadedPct}%)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
