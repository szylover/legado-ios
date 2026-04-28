import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import type { BookSource } from '@/data/entities/BookSource';

export default function BookSources() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const sources = useLiveQuery(() => BookSourceDao.getAll(), []);

  const filtered = (sources ?? []).filter(
    s => s.bookSourceName.includes(q) || s.bookSourceUrl.includes(q)
  );

  const doExport = () => {
    if (!sources?.length) return;
    const blob = new Blob([JSON.stringify(sources, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'legado-sources.json'
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="page-hdr">
        <h1>书源 {sources ? `(${sources.length})` : ''}</h1>
        <button className="btn btn-sm btn-ghost" onClick={doExport}>导出</button>
        <button className="btn btn-sm btn-primary" onClick={() => navigate('/sources/import')}>导入</button>
      </div>

      <div className="search-bar" style={{ position: 'relative', zIndex: 9 }}>
        <input className="search-input" placeholder="搜索书源…"
          value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <p>{q ? '无匹配书源' : '还没有书源，点击右上角导入'}</p>
        </div>
      ) : (
        <div className="page-body">
          {filtered.map(s => (
            <SourceRow key={s.bookSourceUrl} source={s}
              onToggle={() => BookSourceDao.setEnabled(s.bookSourceUrl, !s.enabled)}
              onDelete={() => confirm('确认删除该书源？') && BookSourceDao.delete(s.bookSourceUrl)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceRow({ source, onToggle, onDelete }: {
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
