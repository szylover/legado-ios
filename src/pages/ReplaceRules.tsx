import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ReplaceRuleDao } from '@/data/dao/ReplaceRuleDao';
import type { ReplaceRule } from '@/data/entities/ReplaceRule';

const EMPTY_RULE: Omit<ReplaceRule, 'id'> = {
  name: '',
  pattern: '',
  replacement: '',
  isRegex: false,
  scope: '',
  scopeTitle: false,
  scopeContent: true,
  enabled: true,
  order: 0,
};

export default function ReplaceRules() {
  const navigate = useNavigate();
  const rules = useLiveQuery(() => ReplaceRuleDao.getAll(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<(Partial<ReplaceRule> & { _isNew?: boolean }) | null>(null);
  const [importError, setImportError] = useState('');

  const openNew = () => {
    setEditing({ ...EMPTY_RULE, _isNew: true });
  };

  const openEdit = (rule: ReplaceRule) => {
    setEditing({ ...rule, _isNew: false });
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) { alert('请填写规则名称'); return; }
    if (!editing.pattern?.trim()) { alert('请填写匹配规则'); return; }
    const rule: ReplaceRule = {
      id: editing._isNew ? Date.now() : (editing.id ?? Date.now()),
      name: editing.name ?? '',
      group: editing.group,
      pattern: editing.pattern ?? '',
      replacement: editing.replacement ?? '',
      isRegex: editing.isRegex ?? false,
      scope: editing.scope,
      scopeTitle: editing.scopeTitle,
      scopeContent: editing.scopeContent,
      enabled: editing.enabled ?? true,
      order: editing.order ?? (rules?.length ?? 0),
    };
    await ReplaceRuleDao.upsert(rule);
    setEditing(null);
  };

  const handleImport = () => {
    setImportError('');
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const arr = Array.isArray(json) ? json : [json];
      let count = 0;
      for (const item of arr) {
        if (typeof item === 'object' && item !== null && 'pattern' in item) {
          const r = item as Partial<ReplaceRule>;
          const rule: ReplaceRule = {
            id: (r.id ?? Date.now() + count),
            name: r.name ?? '未命名',
            group: r.group,
            pattern: r.pattern ?? '',
            replacement: r.replacement ?? '',
            isRegex: r.isRegex ?? false,
            scope: r.scope,
            scopeTitle: r.scopeTitle,
            scopeContent: r.scopeContent,
            enabled: r.enabled ?? true,
            order: r.order ?? count,
          };
          await ReplaceRuleDao.upsert(rule);
          count++;
        }
      }
      alert(`成功导入 ${count} 条净化规则`);
    } catch (err) {
      setImportError(`导入失败: ${(err as Error).message}`);
    }
    e.target.value = '';
  };

  const doExport = () => {
    if (!rules?.length) return;
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'legado-replace-rules.json',
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="page-hdr">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', fontSize: 14, marginRight: 8 }}>← 返回</button>
        <h1>净化规则 {rules ? `(${rules.length})` : ''}</h1>
        <button className="btn btn-sm btn-ghost" onClick={doExport}>导出</button>
        <button className="btn btn-sm btn-ghost" onClick={handleImport}>导入JSON</button>
        <button className="btn btn-sm btn-primary" onClick={openNew}>+ 新建</button>
      </div>

      <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

      {importError && (
        <div style={{ padding: '8px 16px', color: 'var(--danger)', fontSize: 13 }}>{importError}</div>
      )}

      {/* Edit/Create Form */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={closeEdit}>
          <div
            style={{
              width: '100%', maxHeight: '90vh', overflowY: 'auto',
              background: 'var(--bg2)', borderRadius: '16px 16px 0 0', padding: '20px 16px 40px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ flex: 1, fontSize: 16, margin: 0 }}>{editing._isNew ? '新建净化规则' : '编辑净化规则'}</h2>
              <button className="btn btn-sm btn-ghost" onClick={closeEdit}>取消</button>
              <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }} onClick={saveEdit}>保存</button>
            </div>

            <FormField label="规则名称 *">
              <input className="search-input" value={editing.name ?? ''} placeholder="如：去广告"
                onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} />
            </FormField>

            <FormField label="分组">
              <input className="search-input" value={editing.group ?? ''} placeholder="可选分组"
                onChange={e => setEditing(p => p ? { ...p, group: e.target.value } : p)} />
            </FormField>

            <FormField label="匹配规则 *">
              <input className="search-input" value={editing.pattern ?? ''} placeholder="文本或正则表达式"
                onChange={e => setEditing(p => p ? { ...p, pattern: e.target.value } : p)} />
            </FormField>

            <FormField label="替换为">
              <input className="search-input" value={editing.replacement ?? ''} placeholder="留空则删除匹配内容"
                onChange={e => setEditing(p => p ? { ...p, replacement: e.target.value } : p)} />
            </FormField>

            <FormField label="书源范围">
              <input className="search-input" value={editing.scope ?? ''} placeholder="书源URL，逗号分隔，留空=全部"
                onChange={e => setEditing(p => p ? { ...p, scope: e.target.value } : p)} />
            </FormField>

            <div style={{ display: 'flex', gap: 16, padding: '8px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={editing.isRegex ?? false}
                  onChange={e => setEditing(p => p ? { ...p, isRegex: e.target.checked } : p)} />
                正则表达式
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={editing.scopeContent ?? true}
                  onChange={e => setEditing(p => p ? { ...p, scopeContent: e.target.checked } : p)} />
                应用到正文
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={editing.scopeTitle ?? false}
                  onChange={e => setEditing(p => p ? { ...p, scopeTitle: e.target.checked } : p)} />
                应用到标题
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={editing.enabled ?? true}
                  onChange={e => setEditing(p => p ? { ...p, enabled: e.target.checked } : p)} />
                启用
              </label>
            </div>
          </div>
        </div>
      )}

      {(!rules || rules.length === 0) ? (
        <div className="empty">
          <p>还没有净化规则，点击右上角新建或导入</p>
        </div>
      ) : (
        <div className="page-body">
          {rules.map(rule => (
            <div key={rule.id} className="source-item">
              <div className="source-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="source-name">{rule.name}</div>
                <div className="source-url" style={{ fontFamily: 'monospace' }}>
                  {rule.pattern} → {rule.replacement || '(删除)'}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  {rule.group && <span className="source-tag">{rule.group}</span>}
                  {rule.isRegex && <span className="source-tag">正则</span>}
                  {rule.scope && <span className="source-tag" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.scope}</span>}
                </div>
              </div>
              <button className={`toggle${rule.enabled ? ' on' : ''}`}
                onClick={() => ReplaceRuleDao.setEnabled(rule.id, !rule.enabled)} />
              <button className="btn btn-sm btn-ghost" onClick={() => openEdit(rule)}>编</button>
              <button className="btn btn-sm btn-danger"
                onClick={() => confirm('确认删除该净化规则？') && ReplaceRuleDao.delete(rule.id)}>删</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
