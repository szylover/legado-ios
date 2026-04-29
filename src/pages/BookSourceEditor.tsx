import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookSourceDao } from '@/data/dao/BookSourceDao';
import type { BookSource, SearchRule, ExploreRule, BookInfoRule, TocRule, ContentRule } from '@/data/entities/BookSource';

type TabKey = 'basic' | 'search' | 'explore' | 'bookinfo' | 'toc' | 'content';

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'basic',    label: '基础' },
  { key: 'search',   label: '搜索' },
  { key: 'explore',  label: '发现' },
  { key: 'bookinfo', label: '详情' },
  { key: 'toc',      label: '目录' },
  { key: 'content',  label: '正文' },
];

const DEFAULT_SOURCE: BookSource = {
  bookSourceUrl: '',
  bookSourceName: '',
  bookSourceGroup: '',
  bookSourceType: 0,
  bookUrlPattern: '',
  customOrder: 0,
  enabled: true,
  enabledExplore: false,
  enabledCookieJar: false,
  concurrentRate: '',
  header: '',
  bookSourceComment: '',
  lastUpdateTime: 0,
  respondTime: 0,
  weight: 0,
  exploreUrl: '',
  searchUrl: '',
  ruleSearch: {},
  ruleExplore: {},
  ruleBookInfo: {},
  ruleToc: {},
  ruleContent: {},
};

export default function BookSourceEditor() {
  const navigate = useNavigate();
  const { bookSourceUrl } = useParams<{ bookSourceUrl?: string }>();
  const isNew = !bookSourceUrl;

  const [tab, setTab] = useState<TabKey>('basic');
  const [form, setForm] = useState<BookSource>({ ...DEFAULT_SOURCE });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    const decoded = decodeURIComponent(bookSourceUrl);
    BookSourceDao.getByUrl(decoded).then(s => {
      if (s) {
        setForm({
          ...DEFAULT_SOURCE,
          ...s,
          ruleSearch: s.ruleSearch ?? {},
          ruleExplore: s.ruleExplore ?? {},
          ruleBookInfo: s.ruleBookInfo ?? {},
          ruleToc: s.ruleToc ?? {},
          ruleContent: s.ruleContent ?? {},
        });
      }
      setLoading(false);
    });
  }, [bookSourceUrl]);

  const set = <K extends keyof BookSource>(key: K, value: BookSource[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const setSearch = (key: keyof SearchRule, value: string) => {
    setForm(f => ({ ...f, ruleSearch: { ...f.ruleSearch, [key]: value } }));
  };

  const setExplore = (key: keyof ExploreRule, value: string) => {
    setForm(f => ({ ...f, ruleExplore: { ...f.ruleExplore, [key]: value } }));
  };

  const setBookInfo = (key: keyof BookInfoRule, value: string) => {
    setForm(f => ({ ...f, ruleBookInfo: { ...f.ruleBookInfo, [key]: value } }));
  };

  const setToc = (key: keyof TocRule, value: string) => {
    setForm(f => ({ ...f, ruleToc: { ...f.ruleToc, [key]: value } }));
  };

  const setContent = (key: keyof ContentRule, value: string) => {
    setForm(f => ({ ...f, ruleContent: { ...f.ruleContent, [key]: value } }));
  };

  const save = async () => {
    setError('');
    if (!form.bookSourceUrl.trim()) { setError('书源URL不能为空'); return; }
    if (!form.bookSourceName.trim()) { setError('书源名称不能为空'); return; }
    setSaving(true);
    try {
      const toSave: BookSource = {
        ...form,
        lastUpdateTime: Date.now(),
      };
      await BookSourceDao.upsert(toSave);
      navigate('/sources');
    } catch (err) {
      setError(`保存失败: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>加载中…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div className="page-hdr">
        <button onClick={() => navigate('/sources')} style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>← 返回</button>
        <h1 style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isNew ? '新建书源' : (form.bookSourceName || '编辑书源')}
        </h1>
        <button className="btn btn-sm btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '6px 16px', background: 'var(--danger)', color: '#fff', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, scrollbarWidth: 'none' }}>
        {TAB_LABELS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 14px', background: 'none', border: 'none', flexShrink: 0,
            borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === key ? 'var(--accent)' : 'var(--text2)',
            fontWeight: tab === key ? 600 : 400,
            cursor: 'pointer', fontSize: 13,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'basic' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="书源名称 *">
              <input className="search-input" value={form.bookSourceName} placeholder="书源显示名称"
                onChange={e => set('bookSourceName', e.target.value)} />
            </Field>
            <Field label="书源URL *">
              <input className="search-input" value={form.bookSourceUrl} placeholder="https://example.com"
                onChange={e => set('bookSourceUrl', e.target.value)} />
            </Field>
            <Field label="分组">
              <input className="search-input" value={form.bookSourceGroup ?? ''} placeholder="可选分组"
                onChange={e => set('bookSourceGroup', e.target.value)} />
            </Field>
            <Field label="书源类型">
              <select value={form.bookSourceType}
                onChange={e => set('bookSourceType', Number(e.target.value) as 0|1|2|3)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }}>
                <option value={0}>文本</option>
                <option value={1}>音频</option>
                <option value={2}>图片</option>
                <option value={3}>文件</option>
              </select>
            </Field>
            <Field label="排序">
              <input className="search-input" type="number" value={form.customOrder}
                onChange={e => set('customOrder', Number(e.target.value))} />
            </Field>
            <Field label="权重">
              <input className="search-input" type="number" value={form.weight}
                onChange={e => set('weight', Number(e.target.value))} />
            </Field>
            <Field label="并发速率">
              <input className="search-input" value={form.concurrentRate ?? ''} placeholder="如: 1000,3"
                onChange={e => set('concurrentRate', e.target.value)} />
            </Field>
            <Field label="书籍URL正则">
              <input className="search-input" value={form.bookUrlPattern ?? ''} placeholder="可选，校验书籍URL"
                onChange={e => set('bookUrlPattern', e.target.value)} />
            </Field>
            <Field label="请求头 (JSON)">
              <textarea className="search-input"
                value={form.header ?? ''} placeholder='{"User-Agent":"..."}'
                rows={3} style={{ resize: 'vertical' }}
                onChange={e => set('header', e.target.value)} />
            </Field>
            <Field label="备注">
              <textarea className="search-input"
                value={form.bookSourceComment ?? ''} placeholder="书源说明"
                rows={2} style={{ resize: 'vertical' }}
                onChange={e => set('bookSourceComment', e.target.value)} />
            </Field>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <Toggle label="启用书源" checked={form.enabled} onChange={v => set('enabled', v)} />
              <Toggle label="启用发现" checked={form.enabledExplore} onChange={v => set('enabledExplore', v)} />
              <Toggle label="Cookie 管理" checked={form.enabledCookieJar ?? false} onChange={v => set('enabledCookieJar', v)} />
            </div>
          </div>
        )}

        {tab === 'search' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="搜索URL">
              <textarea className="search-input" value={form.searchUrl ?? ''} placeholder="搜索地址，支持变量 {{key}} {{page}}"
                rows={3} style={{ resize: 'vertical' }}
                onChange={e => set('searchUrl', e.target.value)} />
            </Field>
            <SectionTitle>搜索规则</SectionTitle>
            <RuleFields prefix="ruleSearch" rules={form.ruleSearch as Partial<Record<string, string | undefined>> ?? {}}
              fields={[
                { key: 'bookList', label: '书籍列表' },
                { key: 'name',     label: '书名' },
                { key: 'author',   label: '作者' },
                { key: 'bookUrl',  label: '书籍链接' },
                { key: 'coverUrl', label: '封面URL' },
                { key: 'intro',    label: '简介' },
                { key: 'kind',     label: '分类' },
                { key: 'lastChapter', label: '最新章节' },
                { key: 'wordCount', label: '字数' },
              ]}
              onChange={(k, v) => setSearch(k as keyof SearchRule, v)}
            />
          </div>
        )}

        {tab === 'explore' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="发现URL">
              <textarea className="search-input" value={form.exploreUrl ?? ''} placeholder="分类名::URL，每行一个"
                rows={6} style={{ resize: 'vertical' }}
                onChange={e => set('exploreUrl', e.target.value)} />
            </Field>
            <SectionTitle>发现规则</SectionTitle>
            <RuleFields prefix="ruleExplore" rules={form.ruleExplore as Partial<Record<string, string | undefined>> ?? {}}
              fields={[
                { key: 'bookList', label: '书籍列表' },
                { key: 'name',     label: '书名' },
                { key: 'author',   label: '作者' },
                { key: 'bookUrl',  label: '书籍链接' },
                { key: 'coverUrl', label: '封面URL' },
                { key: 'intro',    label: '简介' },
                { key: 'kind',     label: '分类' },
                { key: 'lastChapter', label: '最新章节' },
                { key: 'wordCount', label: '字数' },
              ]}
              onChange={(k, v) => setExplore(k as keyof ExploreRule, v)}
            />
          </div>
        )}

        {tab === 'bookinfo' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle>书籍详情规则</SectionTitle>
            <RuleFields prefix="ruleBookInfo" rules={form.ruleBookInfo as Partial<Record<string, string | undefined>> ?? {}}
              fields={[
                { key: 'init',      label: '初始化' },
                { key: 'name',      label: '书名' },
                { key: 'author',    label: '作者' },
                { key: 'intro',     label: '简介' },
                { key: 'kind',      label: '分类' },
                { key: 'coverUrl',  label: '封面URL' },
                { key: 'tocUrl',    label: '目录URL' },
                { key: 'lastChapter', label: '最新章节' },
                { key: 'wordCount', label: '字数' },
              ]}
              onChange={(k, v) => setBookInfo(k as keyof BookInfoRule, v)}
            />
          </div>
        )}

        {tab === 'toc' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle>目录规则</SectionTitle>
            <RuleFields prefix="ruleToc" rules={form.ruleToc as Partial<Record<string, string | undefined>> ?? {}}
              fields={[
                { key: 'chapterList', label: '章节列表' },
                { key: 'chapterName', label: '章节名' },
                { key: 'chapterUrl',  label: '章节链接' },
                { key: 'isVolume',    label: '是否卷' },
                { key: 'isVip',       label: '是否VIP' },
                { key: 'isPay',       label: '是否已购' },
                { key: 'updateTime',  label: '更新时间' },
                { key: 'nextTocUrl',  label: '下一页目录' },
              ]}
              onChange={(k, v) => setToc(k as keyof TocRule, v)}
            />
          </div>
        )}

        {tab === 'content' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle>正文规则</SectionTitle>
            <RuleFields prefix="ruleContent" rules={form.ruleContent as Partial<Record<string, string | undefined>> ?? {}}
              fields={[
                { key: 'content',       label: '正文内容' },
                { key: 'nextContentUrl', label: '下一页链接' },
                { key: 'sourceRegex',   label: '来源正则' },
                { key: 'replaceRegex',  label: '净化规则' },
              ]}
              onChange={(k, v) => setContent(k as keyof ContentRule, v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
      <button className={`toggle${checked ? ' on' : ''}`} onClick={() => onChange(!checked)} />
      {label}
    </label>
  );
}

function RuleFields({
  rules, fields, onChange,
}: {
  prefix: string;
  rules: Partial<Record<string, string | undefined>>;
  fields: Array<{ key: string; label: string }>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      {fields.map(({ key, label }) => (
        <Field key={key} label={label}>
          <input className="search-input" value={rules[key] ?? ''} placeholder={`${label}规则`}
            onChange={e => onChange(key, e.target.value)} />
        </Field>
      ))}
    </>
  );
}
