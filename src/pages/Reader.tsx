import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { getChapterList, getContent } from '@/core/network/WebBook';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';

export default function Reader() {
  const { bookUrl } = useParams<{ bookUrl: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [idx, setIdx] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);

  const decoded = decodeURIComponent(bookUrl ?? '');

  useEffect(() => {
    if (!decoded) return;
    BookDao.getByUrl(decoded).then(b => {
      if (!b) return;
      setBook(b); setIdx(b.durChapterIndex);
      loadChapters(b);
    });
  }, [decoded]);

  async function loadChapters(b: Book) {
    const cached = await BookChapterDao.getByBook(b.bookUrl);
    if (cached.length) { setChapters(cached); return; }
    const src = await BookSourceDao.getByUrl(b.origin);
    if (!src) return;
    const list = await getChapterList(src, b);
    await BookChapterDao.insertMany(list);
    setChapters(list);
  }

  useEffect(() => {
    if (!chapters.length || !book) return;
    const ch = chapters[idx]; if (!ch) return;
    setLoading(true); setContent('');
    BookSourceDao.getByUrl(book.origin).then(async src => {
      try {
        const text = src ? await getContent(src, book, ch) : '找不到书源';
        setContent(text);
      } catch (e) {
        setContent(`加载失败: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    });
    BookDao.updateProgress(book.bookUrl, idx, 0);
  }, [idx, chapters]);

  return (
    <div className="reader-wrap">
      {showCtrl && (
        <div className="reader-hdr">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', flexShrink: 0 }}>← 返回</button>
          <h2>{book?.name}</h2>
        </div>
      )}

      <div className="reader-body" onClick={() => setShowCtrl(v => !v)}>
        {loading
          ? <div style={{ color: 'var(--text2)', textAlign: 'center', marginTop: 40 }}>加载中…</div>
          : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</div>
        }
      </div>

      {showCtrl && chapters.length > 0 && (
        <div className="reader-footer">
          <button className="btn btn-ghost btn-sm" disabled={idx <= 0} onClick={() => setIdx(i => i - 1)}>上一章</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}>
            {chapters[idx]?.title}
          </div>
          <button className="btn btn-ghost btn-sm" disabled={idx >= chapters.length - 1} onClick={() => setIdx(i => i + 1)}>下一章</button>
        </div>
      )}
    </div>
  );
}
