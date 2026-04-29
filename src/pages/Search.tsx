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
  const [searchMeta, setSearchMeta] = useState<{ tried: number; errors: number; done: boolean } | null>(null);
  const aborted = useRef(false);

  const doSearch = async () => {
    if (!kw.trim()) return;
    aborted.current = false;
    setBusy(true); setResults([]); setSearchMeta(null);
    const sources = await BookSourceDao.getEnabled();
    if (!sources.length) { alert('请先导入并启用书源'); setBusy(false); return; }

    const total = sources.length;
    let tried = 0, errors = 0;
    const seen = new Set<string>();

    for (let i = 0; i < total; i += 5) {
      if (aborted.current) break;
      const batch = sources.slice(i, i + 5);
      const settled = await Promise.allSettled(batch.map(s => searchBooks(s, kw)));
      for (const r of settled) {
        tried++;
        if (r.status !== 'fulfilled') {
          errors++;
          console.warn('[Search] error:', (r as PromiseRejectedResult).reason);
          continue;
        }
        setResults(prev => {
          const add: SearchResult[] = [];
          for (const item of r.value) {
            const k = `${item.name}::${item.author}`;
            if (!seen.has(k)) { seen.add(k); add.push(item); }
          }
          return [...prev, ...add];
        });
      }
      setSearchMeta({ tried, errors, done: i + 5 >= total });
    }
    setSearchMeta({ tried, errors, done: true });
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
      </div>

      {results.length === 0 && !busy && !searchMeta && (
        <div className="empty"><p>输入书名或作者搜索</p></div>
      )}
      {results.length === 0 && !busy && searchMeta?.done && (
        <div className="empty">
          <p>无结果</p>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>
            搜索了 {searchMeta.tried} 个书源
            {searchMeta.errors > 0 && `，${searchMeta.errors} 个请求失败（网络或书源规则问题），请打开浏览器控制台查看详情`}
          </p>
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
        {busy && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>
            搜索中… {searchMeta ? `(${searchMeta.tried} 个书源已完成，${searchMeta.errors} 个失败)` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
