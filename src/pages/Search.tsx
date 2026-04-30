import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { BookDao } from '@/data/dao/BookDao';
import { searchBooks, type SearchResult } from '@/core/network/WebBook';

const LS_HISTORY = 'search_history';
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) ?? '[]') as string[]; }
  catch { return []; }
}

function saveHistory(h: string[]) {
  localStorage.setItem(LS_HISTORY, JSON.stringify(h));
}

function addToHistory(kw: string): string[] {
  const h = loadHistory().filter(s => s !== kw);
  const next = [kw, ...h].slice(0, MAX_HISTORY);
  saveHistory(next);
  return next;
}

export default function Search() {
  const navigate = useNavigate();
  const [kw, setKw] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  // Aggregated groups: name::author → alternates list
  const [resultGroups, setResultGroups] = useState<Map<string, SearchResult[]>>(new Map());
  const [busy, setBusy] = useState(false);
  const [searchMeta, setSearchMeta] = useState<{ tried: number; total: number; errors: number; done: boolean } | null>(null);
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [inputFocused, setInputFocused] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null); // key of expanded group
  const aborted = useRef(false);

  const showHistory = inputFocused && !kw.trim() && results.length === 0 && !busy && !searchMeta;

  const cancelSearch = () => {
    aborted.current = true;
    setBusy(false);
  };

  const doSearch = async (keyword?: string) => {
    const q = (keyword ?? kw).trim();
    if (!q) return;
    if (keyword) setKw(keyword);
    // Cancel any in-progress search before starting a new one
    aborted.current = true;
    await new Promise(r => setTimeout(r, 0)); // flush pending batch
    aborted.current = false;
    setBusy(true); setResults([]); setResultGroups(new Map()); setSearchMeta(null);
    const sources = await BookSourceDao.getEnabledWithSearch();
    if (!sources.length) { alert('请先导入并启用书源'); setBusy(false); return; }

    const total = sources.length;
    let tried = 0, errors = 0;
    const seen = new Set<string>();

    const BATCH = 20;
    for (let i = 0; i < total; i += BATCH) {
      if (aborted.current) break;
      const batch = sources.slice(i, i + BATCH);
      const settled = await Promise.allSettled(batch.map(s => searchBooks(s, q)));
      for (let j = 0; j < settled.length; j++) {
        const r = settled[j];
        tried++;
        if (r.status !== 'fulfilled') {
          errors++;
          console.warn('[Search] error from', batch[j]?.bookSourceName, ':', (r as PromiseRejectedResult).reason?.message ?? (r as PromiseRejectedResult).reason);
          continue;
        }
        const add: SearchResult[] = [];
        for (const item of r.value) {
          const k = `${item.name}::${item.author}`;
          if (!seen.has(k)) {
            seen.add(k);
            add.push(item);
            // Start a new group for this book
            setResultGroups(prev => {
              const next = new Map(prev);
              next.set(k, [item]);
              return next;
            });
          } else {
            // Add as alternate source for existing group
            setResultGroups(prev => {
              const next = new Map(prev);
              const existing = next.get(k) ?? [];
              next.set(k, [...existing, item]);
              return next;
            });
          }
        }
        if (add.length > 0) setResults(prev => [...prev, ...add]);
      }
      setSearchMeta({ tried, total, errors, done: i + BATCH >= total });
    }
    setSearchMeta(prev => ({ tried, total, errors, done: true, ...(prev ?? {}) }));
    setBusy(false);

    // Add to history after successful search with results
    if (!aborted.current) {
      const newHistory = addToHistory(q);
      setHistory(newHistory);
    }
  };

  const removeHistory = (item: string) => {
    const next = history.filter(h => h !== item);
    setHistory(next);
    saveHistory(next);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const addBook = async (r: SearchResult) => {
    await BookDao.upsert({
      bookUrl: r.bookUrl, tocUrl: r.bookUrl, origin: r.originUrl,
      originName: r.originName, name: r.name, author: r.author,
      coverUrl: r.coverUrl, intro: r.intro, kind: r.kind,
      latestChapterTitle: r.lastChapter, type: 0, group: 0,
      latestChapterTime: 0, lastCheckTime: 0, lastCheckCount: 0,
      totalChapterNum: 0, scrollIndex: 0, durChapterIndex: 0,
      durChapterPos: 0, durChapterTime: 0, canUpdate: true, order: Date.now(),
    });
    navigate('/');
  };

  return (
    <div>
      <div className="search-bar">
        <input
          className="search-input"
          autoFocus
          placeholder="书名 / 作者…"
          value={kw}
          onChange={e => setKw(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 150)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
        />
        <button className="btn btn-primary" onClick={() => doSearch()} disabled={busy}>
          {busy ? '…' : '搜'}
        </button>
        {busy && (
          <button className="btn" onClick={cancelSearch}
            style={{ marginLeft: 6, color: 'var(--text2)' }}>
            取消
          </button>
        )}
      </div>

      {/* Search history panel */}
      {showHistory && history.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>搜索历史</span>
            <button
              onClick={clearHistory}
              style={{ fontSize: 12, color: 'var(--text2)' }}
            >
              清空
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {history.map(item => (
              <div
                key={item}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'var(--surface)', borderRadius: 16, padding: '5px 12px',
                  fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <span
                  onClick={() => doSearch(item)}
                  style={{ color: 'var(--text)' }}
                >
                  {item}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); removeHistory(item); }}
                  style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1, padding: '0 2px' }}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !busy && !searchMeta && !showHistory && (
        <div className="empty"><p>输入书名或作者搜索</p></div>
      )}
      {results.length === 0 && !busy && !searchMeta && showHistory && history.length === 0 && (
        <div className="empty"><p>输入书名或作者搜索</p></div>
      )}
      {searchMeta && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
          {busy
            ? `已搜 ${searchMeta.tried} / ${searchMeta.total} 个书源，找到 ${results.length} 个结果${searchMeta.errors > 0 ? `，${searchMeta.errors} 个失败` : ''}`
            : results.length > 0
              ? `共搜索 ${searchMeta.total} 个书源，找到 ${results.length} 个结果${searchMeta.errors > 0 ? `，${searchMeta.errors} 个失败` : ''}`
              : `已搜索 ${searchMeta.total} 个书源，无结果${searchMeta.errors > 0 ? `，${searchMeta.errors} 个失败` : ''}`
          }
        </div>
      )}

      <div className="page-body" style={{ paddingTop: 0 }}>
        {results.map((r, i) => {
          const groupKey = `${r.name}::${r.author}`;
          const alternates = resultGroups.get(groupKey) ?? [r];
          const isExpanded = expandedSource === groupKey;
          return (
            <div key={i} className="source-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {r.coverUrl && (
                  <img src={r.coverUrl} alt={r.name}
                    style={{ width: 48, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="source-name">{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{r.author}</div>
                  {r.intro && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.intro}
                    </div>
                  )}
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => addBook(r)}>加入书架</button>
              </div>
              {/* Source selector */}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {alternates.length === 1 ? (
                  <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.8 }}>📚 {r.originName}</span>
                ) : (
                  <button
                    onClick={() => setExpandedSource(isExpanded ? null : groupKey)}
                    style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--surface)',
                      border: '1px solid var(--border)', borderRadius: 12, padding: '3px 10px' }}
                  >
                    📚 {alternates.length} 个来源 {isExpanded ? '▲' : '▼'}
                  </button>
                )}
              </div>
              {isExpanded && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {alternates.map((alt, ai) => (
                    <div key={ai} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 10px', background: 'var(--surface)', borderRadius: 8,
                      fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--text)' }}>{alt.originName}</span>
                      <button className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => addBook(alt)}>选此来源</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {results.length === 0 && busy && !searchMeta && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>搜索中…</div>
        )}
        {results.length === 0 && !busy && searchMeta?.done && results.length === 0 && (
          <div className="empty"><p>无结果</p></div>
        )}
      </div>
    </div>
  );
}
