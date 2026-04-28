/**
 * RssArticleList — RSS 源文章列表页
 * 路由: /rss/:sourceUrl
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RssSourceDao } from '@/data/dao/RssSourceDao';
import { fetchArticles } from '@/model/rss/RssParserByRule';
import type { RssSource } from '@/data/entities/RssSource';
import type { RssArticle } from '@/model/rss/Rss';

export default function RssArticleList() {
  const { sourceUrl } = useParams<{ sourceUrl: string }>();
  const navigate = useNavigate();
  const [source, setSource] = useState<RssSource | null>(null);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const decoded = decodeURIComponent(sourceUrl ?? '');

  useEffect(() => {
    if (!decoded) return;
    RssSourceDao.getByUrl(decoded).then(async src => {
      if (!src) { setError('找不到订阅源'); setLoading(false); return; }
      setSource(src);
      try {
        const list = await fetchArticles(src);
        setArticles(list);
      } catch (e) {
        setError(`加载失败: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    });
  }, [decoded]);

  const openArticle = (a: RssArticle) => {
    navigate(`/rss/article?url=${encodeURIComponent(a.link)}&title=${encodeURIComponent(a.title)}`);
  };

  return (
    <div>
      <div className="page-hdr">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)' }}>← 返回</button>
        <h1 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source?.sourceName ?? '订阅'}
        </h1>
      </div>

      <div className="page-body" style={{ paddingTop: 0 }}>
        {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text2)' }}>加载中…</div>}
        {error  && <div style={{ padding: 20, color: '#f44' }}>{error}</div>}
        {!loading && !error && articles.length === 0 && (
          <div className="empty"><p>暂无文章</p></div>
        )}
        {articles.map((a, i) => (
          <div key={i} className="source-item" style={{ cursor: 'pointer' }} onClick={() => openArticle(a)}>
            {a.image && (
              <img src={a.image} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="source-name" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {a.title}
              </div>
              {a.pubDate && (
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>{a.pubDate}</div>
              )}
              {a.description && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {a.description}
                </div>
              )}
            </div>
            <span style={{ color: 'var(--text2)', fontSize: 18, flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
