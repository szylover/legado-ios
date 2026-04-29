import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import { searchBooks, getBookInfo, getChapterList, getContent } from '@/core/network/WebBook';
import type { BookSource } from '@/data/entities/BookSource';
import type { Book } from '@/data/entities/Book';
import type { BookChapter } from '@/data/entities/BookChapter';
import type { SearchResult } from '@/core/network/WebBook';

type PanelKey = 'search' | 'bookinfo' | 'toc' | 'content';

const PANEL_LABELS: { key: PanelKey; label: string }[] = [
  { key: 'search',   label: '搜索测试' },
  { key: 'bookinfo', label: '详情测试' },
  { key: 'toc',      label: '目录测试' },
  { key: 'content',  label: '正文测试' },
];

export default function BookSourceDebug() {
  const navigate = useNavigate();
  const { bookSourceUrl } = useParams<{ bookSourceUrl: string }>();
  const [source, setSource] = useState<BookSource | null>(null);
  const [panel, setPanel] = useState<PanelKey>('search');

  // Panel states
  const [searchKw, setSearchKw] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [infoUrl, setInfoUrl] = useState('');
  const [infoResult, setInfoResult] = useState<Partial<Book> | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');

  const [tocUrl, setTocUrl] = useState('');
  const [tocChapters, setTocChapters] = useState<BookChapter[]>([]);
  const [tocLoading, setTocLoading] = useState(false);
  const [tocError, setTocError] = useState('');

  const [contentBookUrl, setContentBookUrl] = useState('');
  const [contentChapterUrl, setContentChapterUrl] = useState('');
  const [contentChapterTitle, setContentChapterTitle] = useState('测试章节');
  const [contentText, setContentText] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');

  useEffect(() => {
    if (!bookSourceUrl) return;
    const decoded = decodeURIComponent(bookSourceUrl);
    BookSourceDao.getByUrl(decoded).then(s => {
      if (s) {
        setSource(s);
      }
    });
  }, [bookSourceUrl]);

  const runSearch = async () => {
    if (!source || !searchKw.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchBooks(source, searchKw.trim());
      setSearchResults(results);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearchLoading(false);
    }
  };

  const runBookInfo = async () => {
    if (!source || !infoUrl.trim()) return;
    setInfoLoading(true);
    setInfoError('');
    setInfoResult(null);
    const mockBook: Book = {
      bookUrl: infoUrl.trim(), tocUrl: infoUrl.trim(),
      origin: source.bookSourceUrl, originName: source.bookSourceName,
      name: '', author: '', type: 0, group: 0,
      latestChapterTime: 0, lastCheckTime: 0, lastCheckCount: 0,
      totalChapterNum: 0, scrollIndex: 0, durChapterIndex: 0, durChapterPos: 0,
      durChapterTime: 0, canUpdate: true, order: 0,
    };
    try {
      const result = await getBookInfo(source, mockBook);
      setInfoResult(result);
    } catch (err) {
      setInfoError((err as Error).message);
    } finally {
      setInfoLoading(false);
    }
  };

  const runToc = async () => {
    if (!source || !tocUrl.trim()) return;
    setTocLoading(true);
    setTocError('');
    setTocChapters([]);
    const mockBook: Book = {
      bookUrl: tocUrl.trim(), tocUrl: tocUrl.trim(),
      origin: source.bookSourceUrl, originName: source.bookSourceName,
      name: '', author: '', type: 0, group: 0,
      latestChapterTime: 0, lastCheckTime: 0, lastCheckCount: 0,
      totalChapterNum: 0, scrollIndex: 0, durChapterIndex: 0, durChapterPos: 0,
      durChapterTime: 0, canUpdate: true, order: 0,
    };
    try {
      const chapters = await getChapterList(source, mockBook);
      setTocChapters(chapters);
    } catch (err) {
      setTocError((err as Error).message);
    } finally {
      setTocLoading(false);
    }
  };

  const runContent = async () => {
    if (!source || !contentChapterUrl.trim()) return;
    setContentLoading(true);
    setContentError('');
    setContentText('');
    const mockBook: Book = {
      bookUrl: contentBookUrl.trim() || contentChapterUrl.trim(),
      tocUrl: contentBookUrl.trim() || contentChapterUrl.trim(),
      origin: source.bookSourceUrl, originName: source.bookSourceName,
      name: '', author: '', type: 0, group: 0,
      latestChapterTime: 0, lastCheckTime: 0, lastCheckCount: 0,
      totalChapterNum: 0, scrollIndex: 0, durChapterIndex: 0, durChapterPos: 0,
      durChapterTime: 0, canUpdate: true, order: 0,
    };
    const mockChapter: BookChapter = {
      bookUrl: mockBook.bookUrl,
      index: 0,
      title: contentChapterTitle || '测试章节',
      url: contentChapterUrl.trim(),
      isVolume: false,
      isVip: false,
      isPay: false,
    };
    try {
      const text = await getContent(source, mockBook, mockChapter);
      setContentText(text);
    } catch (err) {
      setContentError((err as Error).message);
    } finally {
      setContentLoading(false);
    }
  };

  if (!source) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>加载中…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div className="page-hdr">
        <button onClick={() => navigate('/sources')} style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>← 返回</button>
        <h1 style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15 }}>
          调试 · {source.bookSourceName}
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, scrollbarWidth: 'none' }}>
        {PANEL_LABELS.map(({ key, label }) => (
          <button key={key} onClick={() => setPanel(key)} style={{
            padding: '10px 14px', background: 'none', border: 'none', flexShrink: 0,
            borderBottom: panel === key ? '2px solid var(--accent)' : '2px solid transparent',
            color: panel === key ? 'var(--accent)' : 'var(--text2)',
            fontWeight: panel === key ? 600 : 400,
            cursor: 'pointer', fontSize: 13,
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Search Panel */}
        {panel === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="search-input" style={{ flex: 1 }} placeholder="输入搜索关键词"
                value={searchKw} onChange={e => setSearchKw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()} />
              <button className="btn btn-primary btn-sm" onClick={runSearch} disabled={searchLoading}>
                {searchLoading ? '…' : '搜索'}
              </button>
            </div>
            {searchError && <ErrorBox msg={searchError} />}
            {searchResults.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>共 {searchResults.length} 条结果</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)' }}>
                      {['书名', '作者', '书籍URL'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px' }}>{r.name}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{r.author}</td>
                        <td style={{ padding: '6px 8px', fontSize: 11, wordBreak: 'break-all', color: 'var(--accent)', maxWidth: 160 }}>
                          <a href={r.bookUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{r.bookUrl}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!searchLoading && !searchError && searchResults.length === 0 && searchKw && (
              <div style={{ color: 'var(--text2)', textAlign: 'center', marginTop: 24 }}>无结果</div>
            )}
          </div>
        )}

        {/* BookInfo Panel */}
        {panel === 'bookinfo' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="search-input" style={{ flex: 1 }} placeholder="输入书籍URL"
                value={infoUrl} onChange={e => setInfoUrl(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={runBookInfo} disabled={infoLoading}>
                {infoLoading ? '…' : '获取'}
              </button>
            </div>
            {infoError && <ErrorBox msg={infoError} />}
            {infoResult && (
              <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12 }}>
                {Object.entries(infoResult).map(([k, v]) => v ? (
                  <div key={k} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)', width: 90, flexShrink: 0 }}>{k}</span>
                    <span style={{ wordBreak: 'break-all' }}>{String(v)}</span>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        )}

        {/* TOC Panel */}
        {panel === 'toc' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="search-input" style={{ flex: 1 }} placeholder="输入目录URL（或书籍URL）"
                value={tocUrl} onChange={e => setTocUrl(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={runToc} disabled={tocLoading}>
                {tocLoading ? '…' : '获取'}
              </button>
            </div>
            {tocError && <ErrorBox msg={tocError} />}
            {tocChapters.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>共 {tocChapters.length} 章，显示前 20 章</div>
                {tocChapters.slice(0, 20).map((ch, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)', width: 32, flexShrink: 0 }}>{ch.index + 1}</span>
                    <span style={{ flex: 1 }}>{ch.title}</span>
                    <a href={ch.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>链接</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Panel */}
        {panel === 'content' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <input className="search-input" placeholder="书籍URL（可选）"
                value={contentBookUrl} onChange={e => setContentBookUrl(e.target.value)} />
              <input className="search-input" placeholder="章节URL *"
                value={contentChapterUrl} onChange={e => setContentChapterUrl(e.target.value)} />
              <input className="search-input" placeholder="章节标题（可选）"
                value={contentChapterTitle} onChange={e => setContentChapterTitle(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={runContent} disabled={contentLoading}>
                {contentLoading ? '加载中…' : '获取正文'}
              </button>
            </div>
            {contentError && <ErrorBox msg={contentError} />}
            {contentText && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                  正文（前 500 字）
                </div>
                <div style={{
                  background: 'var(--surface)', borderRadius: 8, padding: 12,
                  fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {contentText.slice(0, 500)}{contentText.length > 500 ? '…' : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                  全文共 {contentText.length} 字
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '8px 12px', background: 'rgba(244,67,54,0.1)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>
      ⚠️ {msg}
    </div>
  );
}
