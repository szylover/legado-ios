import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookSourceImporter } from '@/help/source/BookSourceImporter';
import { RssSourceImporter } from '@/help/source/RssSourceImporter';

const BASE = 'https://cdn.jsdelivr.net/gh/shidahuilang/shuyuan-bak@main/';

const PRESETS = [
  {
    label: '🐺 大灰狼订阅源',
    desc: '精选付费+免费源',
    url: BASE + '%E5%A4%A7%E7%81%B0%E7%8B%BC%E8%AE%A2%E9%98%85%E6%BA%90.json',
  },
  {
    label: '⭐ 精选书源',
    desc: '推荐，约 16 MB',
    url: BASE + 'good.json',
  },
  {
    label: '📦 完整书源库',
    desc: '全量合集，约 28 MB，较慢',
    url: BASE + 'book.json',
  },
];

type St = { phase: 'idle' | 'loading' | 'done' | 'error'; msg?: string };

export default function BookSourceImport() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [st, setSt] = useState<St>({ phase: 'idle' });
  const [pct, setPct] = useState(0);

  async function importText(text: string) {
    const json = JSON.parse(text);
    const first = Array.isArray(json) ? json[0] : json;
    return first && 'sourceUrl' in first
      ? RssSourceImporter.importFromJson(text)
      : BookSourceImporter.importFromJson(text);
  }

  async function fromUrl(target: string) {
    setSt({ phase: 'loading', msg: '正在下载…' }); setPct(10);
    try {
      const resp = await fetch(`/api/proxy?url=${encodeURIComponent(target)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setPct(50); setSt({ phase: 'loading', msg: '解析导入中…' });
      const r = await importText(await resp.text());
      setPct(100); setSt({ phase: 'done', msg: `成功 ${r.success} 条，失败 ${r.failed} 条` });
    } catch (e) {
      setSt({ phase: 'error', msg: (e as Error).message });
    }
  }

  async function fromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setSt({ phase: 'loading', msg: '读取文件…' }); setPct(20);
    try {
      setPct(60); setSt({ phase: 'loading', msg: '导入中…' });
      const r = await importText(await f.text());
      setPct(100); setSt({ phase: 'done', msg: `成功 ${r.success} 条，失败 ${r.failed} 条` });
    } catch (e) {
      setSt({ phase: 'error', msg: (e as Error).message });
    }
    e.target.value = '';
  }

  return (
    <div>
      <div className="page-hdr">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)' }}>← 返回</button>
        <h1>导入书源</h1>
      </div>
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Quick import presets */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>一键导入推荐书源</div>
          {PRESETS.map(p => (
            <div key={p.url} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{p.desc}</div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={st.phase === 'loading'}
                onClick={() => fromUrl(p.url)}
              >导入</button>
            </div>
          ))}
        </div>

        {/* Custom URL */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>从网络 URL 导入</div>
          <input placeholder="书源 JSON 地址…" value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && url && fromUrl(url)} />
          <button className="btn btn-primary"
            onClick={() => url && fromUrl(url)} disabled={!url || st.phase === 'loading'}>
            导入
          </button>
        </div>

        {/* Local file */}
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>从本地文件导入</div>
          <label className="btn btn-ghost" style={{ justifyContent: 'center', cursor: 'pointer', width: '100%' }}>
            选择 JSON 文件
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={fromFile} />
          </label>
        </div>

        {st.phase !== 'idle' && (
          <div className="card">
            {st.phase === 'loading' && (
              <><div style={{ fontSize: 13, marginBottom: 6 }}>{st.msg}</div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div></>
            )}
            {st.phase === 'done' && <div style={{ color: 'var(--success)' }}>✓ {st.msg}</div>}
            {st.phase === 'error' && <div style={{ color: 'var(--danger)' }}>✗ {st.msg}</div>}
            {st.phase === 'done' && (
              <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }}
                onClick={() => navigate('/sources')}>查看书源</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
