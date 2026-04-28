import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { RssSourceDao } from '@/data/dao/RssSourceDao';
import type { BookSource } from '@/data/entities/BookSource';
import type { RssSource } from '@/data/entities/RssSource';

type Tab = 'book' | 'rss';

export default function BookSources() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('book');
  const bookSources = useLiveQuery(() => BookSourceDao.getAll(), []);
  const rssSources  = useLiveQuery(() => RssSourceDao.getAll(), []);

  const filteredBook = (bookSources ?? []).filter(
    s => s.bookSourceName.includes(q) || s.bookSourceUrl.includes(q)
  );
  const filteredRss = (rssSources ?? []).filter(
    s => s.sourceName.includes(q) || s.sourceUrl.includes(q)
  );

  const doExport = () => {
    const data = tab === 'book' ? bookSources : rssSources;
    if (!data?.length) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: tab === 'book' ? 'legado-booksources.json' : 'legado-rsssources.json',
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="page-hdr">
        <h1>
          {tab === 'book'
            ? `书源 ${bookSources ? `(${bookSources.length})` : ''}`
            : `订阅 ${rssSources  ? `(${rssSources.length})`  : ''}`}
        </h1>
        <button className="btn btn-sm btn-ghost" onClick={doExport}>导出</button>
        <button className="btn btn-sm btn-primary" onClick={() => navigate('/sources/import')}>导入</button>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {(['book', 'rss'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text2)', fontWeight: tab === t ? 600 : 400,
            cursor: 'pointer', fontSize: 14,
          }}>
            {t === 'book' ? '📚 书源' : '📰 RSS 订阅'}
          </button>
        ))}
      </div>

      <div className="search-bar" style={{ position: 'relative', zIndex: 9 }}>
        <input className="search-input" placeholder={tab === 'book' ? '搜索书源…' : '搜索订阅…'}
          value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {tab === 'book' ? (
        filteredBook.length === 0 ? (
          <div className="empty"><p>{q ? '无匹配书源' : '还没有书源，点击右上角导入'}</p></div>
        ) : (
          <div className="page-body">
            {filteredBook.map(s => (
              <BookSourceRow key={s.bookSourceUrl} source={s}
                onToggle={() => BookSourceDao.setEnabled(s.bookSourceUrl, !s.enabled)}
                onDelete={() => confirm('确认删除该书源？') && BookSourceDao.delete(s.bookSourceUrl)}
              />
            ))}
          </div>
        )
      ) : (
        filteredRss.length === 0 ? (
          <div className="empty"><p>{q ? '无匹配订阅' : '还没有 RSS 订阅，点击右上角导入'}</p></div>
        ) : (
          <div className="page-body">
            {filteredRss.map(s => (
              <RssSourceRow key={s.sourceUrl} source={s}
                onRead={() => navigate(`/rss/${encodeURIComponent(s.sourceUrl)}`)}
                onToggle={() => RssSourceDao.setEnabled(s.sourceUrl, !s.enabled)}
                onDelete={() => confirm('确认删除该订阅？') && RssSourceDao.delete(s.sourceUrl)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function BookSourceRow({ source, onToggle, onDelete }: {
  source: BookSource; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div className="source-item">
      <div className="source-info">
        <div className="source-name">{source.bookSourceName}</div>
        <div className="source-url">{source.bookSourceUrl}</div>
        {source.bookSourceGroup && <span className="source-tag">{source.bookSourceGroup}</span>}
      </div>
      <button className={`toggle${source.enabled ? ' on' : ''}`} onClick={onToggle} />
      <button className="btn btn-sm btn-danger" onClick={onDelete}>删</button>
    </div>
  );
}

function RssSourceRow({ source, onRead, onToggle, onDelete }: {
  source: RssSource; onRead: () => void; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div className="source-item" style={{ cursor: 'pointer' }} onClick={onRead}>
      {source.sourceIcon && (
        <img src={source.sourceIcon} alt="" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }}
             onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className="source-info" style={{ flex: 1 }}>
        <div className="source-name">{source.sourceName}</div>
        <div className="source-url">{source.sourceUrl}</div>
        {source.sourceGroup && <span className="source-tag">{source.sourceGroup}</span>}
      </div>
      <button className={`toggle${source.enabled ? ' on' : ''}`}
        onClick={e => { e.stopPropagation(); onToggle(); }} />
      <button className="btn btn-sm btn-danger"
        onClick={e => { e.stopPropagation(); onDelete(); }}>删</button>
    </div>
  );
}
