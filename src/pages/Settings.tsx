import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LS_DIRECT_MODE } from '@/help/http/HttpClient';

export default function Settings() {
  const navigate = useNavigate();
  const [storageInfo, setStorageInfo] = useState<string>('');
  const [directMode, setDirectMode] = useState(() => localStorage.getItem(LS_DIRECT_MODE) === '1');
  const [isStandalone] = useState(
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );

  const toggleDirect = (v: boolean) => {
    localStorage.setItem(LS_DIRECT_MODE, v ? '1' : '0');
    setDirectMode(v);
  };

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        const usedMB = ((usage ?? 0) / 1024 / 1024).toFixed(1);
        const quotaMB = ((quota ?? 0) / 1024 / 1024).toFixed(0);
        setStorageInfo(`已用 ${usedMB} MB / 约 ${quotaMB} MB`);
      });
    }
  }, []);

  const clearAll = () => {
    if (!confirm('确认清除所有书架和书源数据？')) return;
    indexedDB.deleteDatabase('legadoDB');
    localStorage.clear();
    location.reload();
  };

  return (
    <div>
      <div className="page-hdr"><h1>我的</h1></div>
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 安装引导 */}
        {!isStandalone && (
          <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📲 添加到主屏幕</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.9 }}>
              添加后像原生 App 一样全屏使用，数据也不会被自动清除：<br />
              <span style={{ color: 'var(--text1)' }}>1.</span> Safari 底部点 <strong>□↑ 分享</strong> 按钮<br />
              <span style={{ color: 'var(--text1)' }}>2.</span> 下滑找到 <strong>添加到主屏幕</strong><br />
              <span style={{ color: 'var(--text1)' }}>3.</span> 点 <strong>添加</strong> 即完成 ✅
            </div>
          </div>
        )}

        {isStandalone && (
          <div className="card" style={{ borderLeft: '3px solid #4caf50' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>✅ 已安装为主屏幕应用</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>数据将持久保存，不会被自动清除</div>
          </div>
        )}

        {/* 存储信息 */}
        {storageInfo && (
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>本地存储</div>
            <div style={{ fontSize: 14 }}>{storageInfo}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
              书源、书架元数据 + 已下载章节内容
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>数据管理</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'flex-start', gap: 10 }}
              onClick={() => navigate('/backup')}
            >
              <span>☁️</span> 备份与恢复（本地 / WebDAV）
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>🌐 直连模式</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {directMode
                  ? '浏览器直接请求书源（适合在中国大陆使用，绕过代理）'
                  : '通过服务器代理请求（适合境外访问，需 CORS 支持）'}
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 26, flexShrink: 0 }}>
              <input type="checkbox" checked={directMode} onChange={e => toggleDirect(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 26,
                background: directMode ? 'var(--accent)' : 'var(--border)',
                transition: '.2s', cursor: 'pointer',
              }}>
                <span style={{
                  position: 'absolute', height: 20, width: 20, left: directMode ? 20 : 3, bottom: 3,
                  background: '#fff', borderRadius: '50%', transition: '.2s',
                }} />
              </span>
            </label>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>关于</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>阅读 · legado web</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            开源阅读 legado 的 Web 版本，完整兼容 Android 书源格式
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>阅读工具</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/replace-rules')}
            style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}>
            🧹 净化规则管理
          </button>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>危险操作</div>
          <button className="btn btn-danger btn-sm" onClick={clearAll}>清除所有数据</button>
        </div>
      </div>
    </div>
  );
}
