import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { getBookInfo, getChapterList } from '@/core/network/WebBook';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';

export default function BookDetail() {
  const { bookUrl } = useParams<{ bookUrl: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(bookUrl ?? '');

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!decoded) return;
    BookDao.getByUrl(decoded).then(b => {
      if (!b) { navigate('/'); return; }
      setBook(b);
      loadChapters(b);
    });
  }, [decoded]);

  async function loadChapters(b: Book) {
    setLoading(true);
    try {
      const cached = await BookChapterDao.getByBook(b.bookUrl);
      setChapters(cached);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!book) return;
    setRefreshing(true);
    setError('');
    try {
      const src = await BookSourceDao.getByUrl(book.origin);
      if (!src) { setError('找不到书源'); return; }

      // Refresh book info (cover, intro, latest chapter, and resolved tocUrl)
      const info = await getBookInfo(src, book).catch(() => ({}));
      const updatedBook: Book = { ...book, ...info };

      // Refresh chapter list using the resolved tocUrl
      const list = await getChapterList(src, updatedBook);
      await BookChapterDao.deleteByBook(book.bookUrl);
      await BookChapterDao.insertMany(list);
      setChapters(list);

      const finalBook: Book = {
        ...updatedBook,
        totalChapterNum: list.length,
        latestChapterTitle: list[list.length - 1]?.title ?? book.latestChapterTitle,
      };
      await BookDao.upsert(finalBook);
      setBook(finalBook);
    } catch (e) {
      setError(`刷新失败: ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function deleteBook() {
    if (!book) return;
    if (!confirm(`确定删除《${book.name}》？`)) return;
    await BookDao.delete(book.bookUrl);
    await BookChapterDao.deleteByBook(book.bookUrl);
    navigate('/');
  }

  if (!book) return <div className="empty"><p>加载中…</p></div>;

  const totalKnown = book.totalChapterNum || chapters.length;
  const progress = totalKnown > 0 ? Math.round(((book.durChapterIndex + 1) / totalKnown) * 100) : 0;
  const readSeconds = Number(localStorage.getItem(`read_time_${book.bookUrl}`) ?? 0);
  const readMinutes = Math.floor(readSeconds / 60);
  const readHours = Math.floor(readMinutes / 60);
  const readTimeStr = readHours > 0
    ? `${readHours}小时${readMinutes % 60}分`
    : readMinutes > 0 ? `${readMinutes}分钟` : readSeconds > 0 ? `${readSeconds}秒` : null;
  const cachedWords = chapters.reduce((sum, ch) => sum + (ch.cachedContent?.length ?? 0), 0);

  return (
    <div>
      <div className="page-hdr">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', flexShrink: 0 }}>← 返回</button>
        <h1 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.name}</h1>
        <button
          onClick={refresh} disabled={refreshing}
          style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}
        >
          {refreshing ? '刷新中…' : '🔄 刷新'}
        </button>
      </div>

      <div className="page-body">
        {/* Book info */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 80, height: 107, flexShrink: 0, borderRadius: 8, background: 'var(--surface)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {book.coverUrl
              ? <img src={book.coverUrl} alt={book.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📖</div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{book.name}</div>
            <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 4 }}>{book.author}</div>
            {book.originName && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>来源：{book.originName}</div>
            )}
            {book.latestChapterTitle && (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>最新：{book.latestChapterTitle}</div>
            )}
            {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{error}</div>}
          </div>
        </div>

        {/* Reading progress */}
        {totalKnown > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
              <span>阅读进度</span>
              <span>第 {book.durChapterIndex + 1} / {totalKnown} 章 · {progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {chapters[book.durChapterIndex] && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                当前：{chapters[book.durChapterIndex].title}
              </div>
            )}
            {/* Reading stats */}
            {(readTimeStr || cachedWords > 0) && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>
                {readTimeStr && <span>⏱ 累计阅读 {readTimeStr}</span>}
                {cachedWords > 0 && <span>📝 已缓存 {(cachedWords / 10000).toFixed(1)} 万字</span>}
              </div>
            )}
          </div>
        )}

        {/* Intro */}
        {book.intro && (
          <div className="card" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.8, color: 'var(--text2)' }}>
            {book.intro}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => navigate(`/reader/${encodeURIComponent(decoded)}`)}
          >
            {book.durChapterIndex > 0 ? `继续阅读 第${book.durChapterIndex + 1}章` : '开始阅读'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={deleteBook}>删除</button>
        </div>

        {/* Chapter list */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>目录</span>
          {chapters.length > 0 && (
            <span style={{ color: 'var(--text2)', fontSize: 12, marginLeft: 6 }}>（共{chapters.length}章）</span>
          )}
        </div>

        {loading ? (
          <div style={{ color: 'var(--text2)', textAlign: 'center', padding: 20 }}>目录加载中…</div>
        ) : chapters.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', padding: 20 }}>
            暂无目录缓存，点击「开始阅读」将自动加载
          </div>
        ) : (
          <div>
            {chapters.map((ch, i) => (
              <div
                key={ch.url}
                onClick={() => navigate(`/reader/${encodeURIComponent(decoded)}?chapter=${i}`)}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: i === book.durChapterIndex ? 'var(--accent)' : 'var(--text)',
                }}
              >
                {i === book.durChapterIndex && (
                  <span style={{ fontSize: 9, color: 'var(--accent)', flexShrink: 0 }}>▶</span>
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.title}
                </span>
                {ch.cachedContent && (
                  <span style={{ fontSize: 10, color: 'var(--success)', flexShrink: 0 }}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
