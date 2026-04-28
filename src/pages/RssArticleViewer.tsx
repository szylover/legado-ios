/**
 * RssArticleViewer — 文章阅读页（内嵌网页）
 * 路由: /rss/article?url=...&title=...
 */
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function RssArticleViewer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const url   = params.get('url')   ?? '';
  const title = params.get('title') ?? '文章';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* 顶栏 */}
      <div className="reader-hdr" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', flexShrink: 0 }}>← 返回</button>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15, fontWeight: 500 }}>
          {title}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer"
           style={{ color: 'var(--accent)', fontSize: 12, flexShrink: 0, textDecoration: 'none' }}>
          浏览器打开
        </a>
      </div>

      {/* 内嵌网页 */}
      {url ? (
        <iframe
          src={url}
          style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
          无效链接
        </div>
      )}
    </div>
  );
}
