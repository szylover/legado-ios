import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { getChapterList, getContent } from '@/core/network/WebBook';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';
import type { BookSource } from '@/data/entities/BookSource';

export default function Reader() {
  const { bookUrl } = useParams<{ bookUrl: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [source, setSource] = useState<BookSource | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [idx, setIdx] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  // download state
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlTotal, setDlTotal] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const abortRef = useRef(false);

  const decoded = decodeURIComponent(bookUrl ?? '');

  useEffect(() => {
    const online = () => setOffline(false);
    const offline = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  useEffect(() => {
    if (!decoded) return;
    BookDao.getByUrl(decoded).then(b => {
      if (!b) return;
      setBook(b); setIdx(b.durChapterIndex);
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
  }

  useEffect(() => {
    if (!chapters.length || !book) return;
    const ch = chapters[idx]; if (!ch) return;
    // 优先使用缓存
    if (ch.cachedContent) { setContent(ch.cachedContent); return; }
    if (offline) { setContent('📵 离线模式 — 该章节未缓存'); return; }
    setLoading(true); setContent('');
    BookSourceDao.getByUrl(book.origin).then(async src => {
      try {
        const text = src ? await getContent(src, book, ch) : '找不到书源';
        setContent(text);
        // 写入缓存
        await BookChapterDao.cacheContent(book.bookUrl, ch.url, text);
        setCachedCount(c => c + 1);
      } catch (e) {
        setContent(`加载失败: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    });
    BookDao.updateProgress(book.bookUrl, idx, 0);
  }, [idx, chapters]);

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
        // 稍作间隔避免频繁请求
        await new Promise(r => setTimeout(r, 200));
      } catch { /* skip failed */ }
    }
    setDownloading(false);
  }

  const downloadedPct = chapters.length ? Math.round((cachedCount / chapters.length) * 100) : 0;

  return (
    <div className="reader-wrap">
      {showCtrl && (
        <div className="reader-hdr">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', flexShrink: 0 }}>← 返回</button>
          <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book?.name}</h2>
          {offline && <span style={{ fontSize: 11, color: '#f90', flexShrink: 0 }}>离线</span>}
        </div>
      )}

      <div className="reader-body" onClick={() => setShowCtrl(v => !v)}>
        {loading
          ? <div style={{ color: 'var(--text2)', textAlign: 'center', marginTop: 40 }}>加载中…</div>
          : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</div>
        }
      </div>

      {showCtrl && chapters.length > 0 && (
        <div className="reader-footer" style={{ flexDirection: 'column', gap: 6, padding: '8px 12px' }}>
          {/* 下载进度条 */}
          {downloading && (
            <div style={{ width: '100%', fontSize: 12, color: 'var(--text2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span>下载缓存中 {dlProgress}/{dlTotal}</span>
                <button style={{ fontSize: 11, color: '#f44' }} onClick={() => { abortRef.current = true; }}>停止</button>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 3, height: 4 }}>
                <div style={{ background: 'var(--accent)', width: `${dlTotal ? (dlProgress/dlTotal*100) : 0}%`, height: '100%', borderRadius: 3, transition: 'width .3s' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <button className="btn btn-ghost btn-sm" disabled={idx <= 0} onClick={() => setIdx(i => i - 1)}>上一章</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--text2)' }}>
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
