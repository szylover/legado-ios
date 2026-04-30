import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import type { Book } from '@/data/entities/Book';

export default function Bookshelf() {
  const navigate = useNavigate();
  const books = useLiveQuery(() => BookDao.getAll(), []);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!books) return null;

  const toggleSelect = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === books.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(books.map(b => b.bookUrl)));
    }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`确定删除选中的 ${selected.size} 本书？`)) return;
    for (const url of selected) {
      await BookDao.delete(url);
      await BookChapterDao.deleteByBook(url);
    }
    setSelected(new Set());
    setManaging(false);
  };

  const exitManage = () => {
    setManaging(false);
    setSelected(new Set());
  };

  return (
    <div>
      <div className="page-hdr">
        <h1>书架</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {managing ? (
            <>
              <button onClick={toggleAll} style={{ color: 'var(--text2)', fontSize: 13 }}>
                {selected.size === books.length ? '取消全选' : '全选'}
              </button>
              {selected.size > 0 && (
                <button onClick={deleteSelected}
                  style={{ color: 'var(--danger)', fontSize: 13 }}>
                  删除({selected.size})
                </button>
              )}
              <button onClick={exitManage} style={{ color: 'var(--accent)', fontSize: 14 }}>完成</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/search')} style={{ color: 'var(--accent)', fontSize: 14 }}>搜索</button>
              {books.length > 0 && (
                <button onClick={() => setManaging(true)} style={{ color: 'var(--text2)', fontSize: 14 }}>管理</button>
              )}
            </>
          )}
        </div>
      </div>

      {books.length === 0 ? (
        <div className="empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <p>书架空空如也<br />去搜索添加书籍，或先导入书源</p>
          <button className="btn btn-primary" onClick={() => navigate('/sources')}>管理书源</button>
        </div>
      ) : (
        <div className="book-grid">
          {books.map(book => (
            <BookCard
              key={book.bookUrl}
              book={book}
              managing={managing}
              selected={selected.has(book.bookUrl)}
              onClick={() => managing ? toggleSelect(book.bookUrl) : navigate(`/book/${encodeURIComponent(book.bookUrl)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({ book, onClick, managing, selected }: {
  book: Book;
  onClick: () => void;
  managing?: boolean;
  selected?: boolean;
}) {
  const total = book.totalChapterNum || 0;
  const cur = book.durChapterIndex || 0;
  const pct = total > 0 ? Math.round(((cur + 1) / total) * 100) : 0;

  return (
    <div className="book-card" onClick={onClick}
      style={{ position: 'relative', opacity: managing && !selected ? 0.6 : 1 }}>
      {managing && (
        <div style={{
          position: 'absolute', top: 4, right: 4, zIndex: 10,
          width: 20, height: 20, borderRadius: '50%',
          background: selected ? 'var(--accent)' : 'rgba(0,0,0,0.35)',
          border: `2px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.7)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', fontWeight: 700,
        }}>
          {selected ? '✓' : ''}
        </div>
      )}
      <div className="book-cover">
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.name} loading="lazy" />
          : <div className="book-cover-ph">📖</div>}
        {total > 0 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, background: 'rgba(0,0,0,0.3)',
          }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
          </div>
        )}
      </div>
      <div className="book-title">{book.name}</div>
      {total > 0 ? (
        <div className="book-author" style={{ fontSize: 10 }}>
          {pct < 100 ? `${pct}% · 第${cur + 1}章` : '✓ 已读完'}
        </div>
      ) : (
        <div className="book-author">{book.author}</div>
      )}
    </div>
  );
}
