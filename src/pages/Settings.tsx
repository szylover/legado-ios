export default function Settings() {
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
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>关于</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>legado web</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            开源阅读 legado 的 Web 版本，完整兼容 Android 书源格式
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>添加到主屏幕</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
            Safari → 分享按钮 → 添加到主屏幕<br />
            即可像 App 一样全屏使用
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
