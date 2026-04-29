import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { BookDao } from '@/data/dao/BookDao';
import { parseExploreUrls, exploreBooks, type ExploreItem } from '@/core/network/webBook/BookExplore';
import type { BookSource } from '@/data/entities/BookSource';
import type { Book } from '@/data/entities/Book';

export default function Explore() {
  const navigate = useNavigate();

  const allSources = useLiveQuery(() => BookSourceDao.getAll(), []);
  const exploreSources = (allSources ?? []).filter(
    s => s.enabled && s.enabledExplore && s.exploreUrl
  );

  const [selectedSource, setSelectedSource] = useState<BookSource | null>(null);
  const [categories, setCategories] = useState<Array<{ title: string; url: string }>>([]);
  const [selectedCat, setSelectedCat] = useState<{ title: string; url: string } | null>(null);
  const [results, setResults] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  // When explore sources load, auto-select first
  useEffect(() => {
    if (exploreSources.length > 0 && !selectedSource) {
      setSelectedSource(exploreSources[0]);
    }
  }, [exploreSources.length]);

  // When source changes, update categories
  useEffect(() => {
    if (!selectedSource?.exploreUrl) {
      setCategories([]);
      setSelectedCat(null);
      return;
    }
    const cats = parseExploreUrls(selectedSource.exploreUrl);
    setCategories(cats);
    setSelectedCat(cats[0] ?? null);
  }, [selectedSource?.bookSourceUrl]);

  // When category selected, load books
  useEffect(() => {
    if (!selectedSource || !selectedCat) return;
    setResults([]);
    setError('');
    setLoading(true);
    exploreBooks(selectedSource, selectedCat.url, 1)
      .then(items => setResults(items))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [selectedSource?.bookSourceUrl, selectedCat?.url]);

  const addToShelf = async (item: ExploreItem) => {
    const book: Book = {
      bookUrl: item.bookUrl,
      tocUrl: item.bookUrl,
      origin: item.originUrl,
      originName: item.originName,
      name: item.name,
      author: item.author,
      kind: item.kind,
      coverUrl: item.coverUrl,
      intro: item.intro,
      wordCount: item.wordCount,
      type: 0,
      group: 0,
      latestChapterTitle: item.lastChapter,
      latestChapterTime: Date.now(),
      lastCheckTime: 0,
      lastCheckCount: 0,
      totalChapterNum: 0,
      scrollIndex: 0,
      durChapterIndex: 0,
      durChapterPos: 0,
      durChapterTime: Date.now(),
      canUpdate: true,
      order: Date.now(),
    };
    await BookDao.upsert(book);
    setAddedUrls(prev => new Set([...prev, item.bookUrl]));
  };

  return (
    <div>
      <div className="page-hdr">
        <h1>发现</h1>
      </div>

      {/* Source picker */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {exploreSources.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text2)', padding: '4px 0' }}>
            暂无可用的发现书源，请先在书源管理中启用"发现"功能
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }} onClick={() => navigate('/sources')}>管理书源</button>
          </div>
        ) : (
          <select
            value={selectedSource?.bookSourceUrl ?? ''}
            onChange={e => {
              const s = exploreSources.find(x => x.bookSourceUrl === e.target.value);
              setSelectedSource(s ?? null);
            }}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text)', fontSize: 14,
            }}
          >
            {exploreSources.map(s => (
              <option key={s.bookSourceUrl} value={s.bookSourceUrl}>{s.bookSourceName}</option>
            ))}
          </select>
        )}
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 8, padding: '8px 16px',
          borderBottom: '1px solid var(--border)', background: 'var(--bg)',
          scrollbarWidth: 'none',
        }}>
          {categories.map(cat => (
            <button
              key={cat.url}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 13, flexShrink: 0,
                background: selectedCat?.url === cat.url ? 'var(--accent)' : 'var(--surface)',
                color: selectedCat?.url === cat.url ? '#fff' : 'var(--text)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>加载中…</div>
      )}

      {error && !loading && (
        <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>
          ⚠️ 加载失败：{error}
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }}
            onClick={() => {
              if (!selectedSource || !selectedCat) return;
              setError('');
              setLoading(true);
              exploreBooks(selectedSource, selectedCat.url)
                .then(setResults)
                .catch(err => setError((err as Error).message))
                .finally(() => setLoading(false));
            }}>
            重试
          </button>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="book-grid" style={{ padding: 16 }}>
          {results.map(item => (
            <ExploreCard
              key={item.bookUrl}
              item={item}
              added={addedUrls.has(item.bookUrl)}
              onAdd={() => addToShelf(item)}
              onDetail={() => navigate(`/book/${encodeURIComponent(item.bookUrl)}`)}
            />
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && selectedCat && (
        <div className="empty"><p>该分类暂无内容</p></div>
      )}

      {!selectedSource && exploreSources.length === 0 && (
        <div className="empty">
          <p>请先导入支持发现功能的书源</p>
          <button className="btn btn-primary" onClick={() => navigate('/sources')}>管理书源</button>
        </div>
      )}
    </div>
  );
}

function ExploreCard({
  item, added, onAdd, onDetail,
}: {
  item: ExploreItem;
  added: boolean;
  onAdd: () => void;
  onDetail: () => void;
}) {
  return (
    <div className="book-card" style={{ position: 'relative' }}>
      <div className="book-cover" onClick={onDetail} style={{ cursor: 'pointer' }}>
        {item.coverUrl
          ? <img src={item.coverUrl} alt={item.name} loading="lazy" />
          : <div className="book-cover-ph">📖</div>}
      </div>
      <div className="book-title" onClick={onDetail} style={{ cursor: 'pointer' }}>{item.name}</div>
      <div className="book-author">{item.author}</div>
      <button
        onClick={onAdd}
        disabled={added}
        style={{
          marginTop: 4, width: '100%', padding: '4px 0',
          fontSize: 11, borderRadius: 6,
          background: added ? 'var(--surface)' : 'var(--accent)',
          color: added ? 'var(--text2)' : '#fff',
          border: 'none', cursor: added ? 'default' : 'pointer',
        }}
      >
        {added ? '已加入' : '+ 书架'}
      </button>
    </div>
  );
}
