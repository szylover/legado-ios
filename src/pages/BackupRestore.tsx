import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportBackup, importBackup } from '@/help/backup/BackupService';
import { ensureDir, putFile, getFile, type WebDavConfig } from '@/help/backup/WebDavClient';

const LS_WEBDAV = 'webdav_config';

function loadConfig(): WebDavConfig {
  try {
    const raw = localStorage.getItem(LS_WEBDAV);
    if (raw) return JSON.parse(raw) as WebDavConfig;
  } catch { /* ignore */ }
  return { url: '', username: '', password: '' };
}

const BACKUP_FILENAME = 'legado-backup.json';

export default function BackupRestore() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<WebDavConfig>(loadConfig);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const saveConfig = () => {
    localStorage.setItem(LS_WEBDAV, JSON.stringify(cfg));
    setMsg({ type: 'ok', text: 'WebDAV 配置已保存' });
  };

  const localExport = async () => {
    setBusy(true); setMsg(null);
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: BACKUP_FILENAME,
      });
      a.click(); URL.revokeObjectURL(a.href);
      setMsg({ type: 'ok', text: '✅ 备份文件已下载' });
    } catch (e) {
      setMsg({ type: 'err', text: `❌ ${(e as Error).message}` });
    } finally { setBusy(false); }
  };

  const localImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setBusy(true); setMsg(null);
      try {
        const text = await file.text();
        const { imported, errors } = await importBackup(text);
        setMsg({ type: errors.length ? 'err' : 'ok', text: `✅ 已恢复 ${imported} 条记录${errors.length ? `\n⚠️ ${errors.join('; ')}` : ''}` });
      } catch (e) {
        setMsg({ type: 'err', text: `❌ ${(e as Error).message}` });
      } finally { setBusy(false); }
    };
    input.click();
  };

  const webdavBackup = async () => {
    if (!cfg.url) { setMsg({ type: 'err', text: 'WebDAV 地址不能为空' }); return; }
    setBusy(true); setMsg(null);
    try {
      await ensureDir(cfg);
      const json = await exportBackup();
      await putFile(cfg, BACKUP_FILENAME, json);
      setMsg({ type: 'ok', text: `✅ 已备份到 WebDAV: ${cfg.url}${BACKUP_FILENAME}` });
    } catch (e) {
      setMsg({ type: 'err', text: `❌ ${(e as Error).message}` });
    } finally { setBusy(false); }
  };

  const webdavRestore = async () => {
    if (!cfg.url) { setMsg({ type: 'err', text: 'WebDAV 地址不能为空' }); return; }
    if (!confirm('确认从 WebDAV 恢复？这将合并（不删除）现有数据。')) return;
    setBusy(true); setMsg(null);
    try {
      const json = await getFile(cfg, BACKUP_FILENAME);
      const { imported, errors } = await importBackup(json);
      setMsg({ type: errors.length ? 'err' : 'ok', text: `✅ 已恢复 ${imported} 条记录${errors.length ? `\n⚠️ ${errors.join('; ')}` : ''}` });
    } catch (e) {
      setMsg({ type: 'err', text: `❌ ${(e as Error).message}` });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-hdr">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)' }}>← 返回</button>
        <h1>备份与恢复</h1>
      </div>
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Status message */}
        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: msg.type === 'ok' ? 'rgba(102,187,106,0.15)' : 'rgba(239,83,80,0.15)',
            color: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)',
            whiteSpace: 'pre-line',
            border: `1px solid ${msg.type === 'ok' ? 'var(--success)' : 'var(--danger)'}`,
          }}>
            {msg.text}
          </div>
        )}

        {/* Local backup */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📁 本地文件</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={localExport} disabled={busy}>
              导出备份
            </button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={localImport} disabled={busy}>
              导入恢复
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8 }}>
            备份内容：书源、书架、分组、RSS 订阅（不含章节正文缓存）
          </div>
        </div>

        {/* WebDAV config */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>☁️ WebDAV 同步</div>

          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>服务器地址</label>
          <input
            placeholder="https://dav.example.com/legado/"
            value={cfg.url}
            onChange={e => setCfg(c => ({ ...c, url: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>用户名</label>
          <input
            placeholder="username"
            value={cfg.username}
            onChange={e => setCfg(c => ({ ...c, username: e.target.value }))}
            style={{ marginBottom: 10 }}
          />

          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>密码</label>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="password"
              value={cfg.password}
              onChange={e => setCfg(c => ({ ...c, password: e.target.value }))}
              style={{ paddingRight: 44 }}
            />
            <button
              onClick={() => setShowPass(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text2)' }}
            >{showPass ? '隐藏' : '显示'}</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={saveConfig}>保存配置</button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={webdavBackup} disabled={busy || !cfg.url}>
              {busy ? '…' : '备份到 WebDAV'}
            </button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={webdavRestore} disabled={busy || !cfg.url}>
              {busy ? '…' : '从 WebDAV 恢复'}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8, lineHeight: 1.6 }}>
            文件名：<code style={{ fontSize: 11 }}>{BACKUP_FILENAME}</code><br />
            坚果云 WebDAV：设置 → 账户信息 → WebDAV 密码
          </div>
        </div>
      </div>
    </div>
  );
}
