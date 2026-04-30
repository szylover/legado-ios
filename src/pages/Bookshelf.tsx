import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookDao } from '@/data/dao/BookDao';
import { BookChapterDao } from '@/data/dao/BookChapterDao';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { getChapterList, getBookInfo } from '@/core/network/WebBook';
import type { Book } from '@/data/entities/Book';

type SortOrder = '最近阅读' | '书名' | '入库时间';
type ViewMode = 'grid' | 'list';

const SORT_OPTIONS: SortOrder[] = ['最近阅读', '书名', '入库时间'];
const LS_VIEW = 'bookshelf_view';
const LS_SORT = 'bookshelf_sort';

function sortBooks(books: Book[], order: SortOrder): Book[] {
  const arr = [...books];
  if (order === '最近阅读') {
    return arr.sort((a, b) => (b.durChapterTime || b.order || 0) - (a.durChapterTime || a.order || 0));
  } else if (order === '书名') {
    return arr.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  } else {
    // 入库时间: original insertion order ascending
    return arr.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
}

export default function Bookshelf() {
  const navigate = useNavigate();
  const books = useLiveQuery(() => BookDao.getAll(), []);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(LS_VIEW) as ViewMode | null) ?? 'grid',
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    () => (localStorage.getItem(LS_SORT) as SortOrder | null) ?? '最近阅读',
  );

  // Update-all state
  const [updating, setUpdating] = useState(false);
  const [updateToast, setUpdateToast] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(LS_VIEW, viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem(LS_SORT, sortOrder); }, [sortOrder]);

  if (!books) return null;

  const sortedBooks = sortBooks(books, sortOrder);

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

  const cycleSortOrder = () => {
    setSortOrder(prev => {
      const i = SORT_OPTIONS.indexOf(prev);
      return SORT_OPTIONS[(i + 1) % SORT_OPTIONS.length];
    });
  };

  const updateAllBooks = async () => {
    if (updating || !books.length) return;
    setUpdating(true);
    const total = books.length;
    let done = 0;
    let newChaptersCount = 0;
    setUpdateToast(`更新中 0/${total}...`);

    const updateBook = async (book: Book): Promise<boolean> => {
      try {
        const src = await BookSourceDao.getByUrl(book.origin);
        if (!src) return false;
        let bookForToc: Book = book;
        if (book.tocUrl === book.bookUrl && src.ruleBookInfo?.tocUrl) {
          const info = await getBookInfo(src, book).catch(() => ({} as Partial<Book>));
          bookForToc = { ...book, ...info };
          if (info.tocUrl) await BookDao.upsert(bookForToc);
        }
        const list = await getChapterList(src, bookForToc);
        const prevTotal = book.totalChapterNum || 0;
        const hasNew = list.length > prevTotal;
        await BookChapterDao.insertMany(list);
        await BookDao.upsert({
          ...bookForToc,
          totalChapterNum: list.length,
          latestChapterTitle: list[list.length - 1]?.title,
        });
        return hasNew;
      } catch {
        return false;
      }
    };

    // Concurrent worker pool — at most 3 parallel
    const queue = [...books];
    const worker = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const book = queue.shift();
        if (!book) break;
        const hasNew = await updateBook(book);
        if (hasNew) newChaptersCount++;
        done++;
        setUpdateToast(`更新中 ${done}/${total}...`);
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    setUpdating(false);
    setUpdateToast(`✅ 更新完成，${newChaptersCount} 本有新章节`);
    setTimeout(() => setUpdateToast(null), 3000);
  };

  return (
    <div>
      {/* Progress / result toast */}
      {updateToast && (
        <div style={{
          position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.78)', color: '#fff', padding: '8px 18px',
          borderRadius: 20, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {updateToast}
        </div>
      )}

      <div className="page-hdr">
        <h1>书架</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {managing ? (
            <>
              <button onClick={toggleAll} style={{ color: 'var(--text2)', fontSize: 13 }}>
                {selected.size === books.length ? '取消全选' : '全选'}
              </button>
              {selected.size > 0 && (
                <button onClick={deleteSelected} style={{ color: 'var(--danger)', fontSize: 13 }}>
                  删除({selected.size})
                </button>
              )}
              <button onClick={exitManage} style={{ color: 'var(--accent)', fontSize: 14 }}>完成</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/search')} style={{ color: 'var(--accent)', fontSize: 14 }}>搜索</button>
              {books.length > 0 && (
                <>
                  <button
                    onClick={updateAllBooks}
                    disabled={updating}
                    style={{ color: 'var(--accent)', fontSize: 13 }}
                    title="一键更新所有书籍"
                  >
                    🔄 全部更新
                  </button>
                  <button
                    onClick={cycleSortOrder}
                    title={`当前排序: ${sortOrder}`}
                    style={{ color: 'var(--text2)', fontSize: 11, padding: '2px 6px',
                      border: '1px solid var(--border)', borderRadius: 6 }}
                  >
                    {sortOrder}
                  </button>
                  <button
                    onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                    title={viewMode === 'grid' ? '切换为列表视图' : '切换为网格视图'}
                    style={{ color: 'var(--text2)', fontSize: 18, lineHeight: 1 }}
                  >
                    {viewMode === 'grid' ? '☰' : '⊞'}
                  </button>
                  <button onClick={() => setManaging(true)} style={{ color: 'var(--text2)', fontSize: 14 }}>管理</button>
                </>
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
      ) : viewMode === 'grid' ? (
        <div className="book-grid">
          {sortedBooks.map(book => (
            <BookCard
              key={book.bookUrl}
              book={book}
              managing={managing}
              selected={selected.has(book.bookUrl)}
              onClick={() => managing ? toggleSelect(book.bookUrl) : navigate(`/book/${encodeURIComponent(book.bookUrl)}`)}
            />
          ))}
        </div>
      ) : (
        <div className="book-list">
          {sortedBooks.map(book => (
            <BookListItem
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

function BookListItem({ book, onClick, managing, selected }: {
  book: Book;
  onClick: () => void;
  managing?: boolean;
  selected?: boolean;
}) {
  const total = book.totalChapterNum || 0;
  const cur = book.durChapterIndex || 0;
  const pct = total > 0 ? Math.round(((cur + 1) / total) * 100) : 0;

  return (
    <div
      className="book-list-item"
      onClick={onClick}
      style={{ opacity: managing && !selected ? 0.6 : 1 }}
    >
      {managing && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: selected ? 'var(--accent)' : 'rgba(128,128,128,0.25)',
          border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', fontWeight: 700,
        }}>
          {selected ? '✓' : ''}
        </div>
      )}
      {/* Cover thumbnail 48×64 */}
      <div style={{
        width: 48, height: 64, flexShrink: 0, borderRadius: 5,
        overflow: 'hidden', background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border)',
      }}>
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.name} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 22 }}>📖</span>}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
        <div style={{
          fontWeight: 600, fontSize: 14, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {book.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{book.author}</div>
        {total > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>
            {pct < 100 ? `${pct}% · 第${cur + 1}章 / 共${total}章` : '✓ 已读完'}
          </div>
        )}
        {book.latestChapterTitle && (
          <div style={{
            fontSize: 11, color: 'var(--accent)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            最新: {book.latestChapterTitle}
          </div>
        )}
      </div>
    </div>
  );
}
