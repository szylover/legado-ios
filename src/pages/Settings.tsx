import { useEffect, useState } from 'react';

export default function Settings() {
  const [storageInfo, setStorageInfo] = useState<string>('');
  const [isStandalone] = useState(
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

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
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>关于</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>阅读 · legado web</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            开源阅读 legado 的 Web 版本，完整兼容 Android 书源格式
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>危险操作</div>
          <button className="btn btn-danger btn-sm" onClick={clearAll}>清除所有数据</button>
        </div>
      </div>
    </div>
  );
}
