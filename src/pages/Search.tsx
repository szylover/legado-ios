import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { BookDao } from '@/data/dao/BookDao';
import { searchBooks, type SearchResult } from '@/core/network/WebBook';

export default function Search() {
  const navigate = useNavigate();
  const [kw, setKw] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [searchMeta, setSearchMeta] = useState<{ tried: number; total: number; errors: number; done: boolean } | null>(null);
  const aborted = useRef(false);

  const cancelSearch = () => {
    aborted.current = true;
    setBusy(false);
  };

  const doSearch = async () => {
    if (!kw.trim()) return;
    // Cancel any in-progress search before starting a new one
    aborted.current = true;
    await new Promise(r => setTimeout(r, 0)); // flush pending batch
    aborted.current = false;
    setBusy(true); setResults([]); setSearchMeta(null);
    const sources = await BookSourceDao.getEnabledWithSearch();
    console.log('[Search] sources with search rules:', sources.length, sources.slice(0, 3).map(s => s.bookSourceName));
    if (!sources.length) { alert('请先导入并启用书源'); setBusy(false); return; }

    const total = sources.length;
    let tried = 0, errors = 0;
    const seen = new Set<string>();

    const BATCH = 20;
    for (let i = 0; i < total; i += BATCH) {
      if (aborted.current) break;
      const batch = sources.slice(i, i + BATCH);
      const settled = await Promise.allSettled(batch.map(s => searchBooks(s, kw)));
      for (let j = 0; j < settled.length; j++) {
        const r = settled[j];
        tried++;
        if (r.status !== 'fulfilled') {
          errors++;
          console.warn('[Search] error from', batch[j]?.bookSourceName, ':', (r as PromiseRejectedResult).reason?.message ?? (r as PromiseRejectedResult).reason);
          continue;
        }
        if (r.value.length > 0) console.log('[Search] got', r.value.length, 'results from', batch[j]?.bookSourceName);
        setResults(prev => {
          const add: SearchResult[] = [];
          for (const item of r.value) {
            const k = `${item.name}::${item.author}`;
            if (!seen.has(k)) { seen.add(k); add.push(item); }
          }
          return [...prev, ...add];
        });
      }
      setSearchMeta({ tried, total, errors, done: i + BATCH >= total });
    }
    setSearchMeta({ tried, total, errors, done: true });
    setBusy(false);
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
        <input className="search-input" autoFocus placeholder="书名 / 作者…"
          value={kw} onChange={e => setKw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()} />
        <button className="btn btn-primary" onClick={doSearch} disabled={busy}>
          {busy ? '…' : '搜'}
        </button>
        {busy && (
          <button className="btn" onClick={cancelSearch}
            style={{ marginLeft: 6, color: 'var(--text2)' }}>
            取消
          </button>
        )}
      </div>

      {results.length === 0 && !busy && !searchMeta && (
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
        {results.map((r, i) => (
          <div key={i} className="source-item" style={{ alignItems: 'flex-start' }}>
            {r.coverUrl && (
              <img src={r.coverUrl} alt={r.name}
                style={{ width: 48, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="source-name">{r.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{r.author}</div>
              {r.originName && (
                <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, opacity: 0.8 }}>
                  📚 {r.originName}
                </div>
              )}
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
        ))}
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
