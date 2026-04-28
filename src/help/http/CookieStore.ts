/**
 * CookieStore — 按域名持久化 Cookie
 * 对应 legado Android: CookieStore.kt
 * Web 版使用 localStorage 存储
 */

const COOKIE_PREFIX = 'legado_cookies_';

function getDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function parseCookieHeader(header: string): Record<string, string> {
  const skip = new Set(['path','expires','domain','secure','httponly','samesite','max-age']);
  const cookies: Record<string, string> = {};
  header.split(';').forEach((part) => {
    const [k, ...vs] = part.trim().split('=');
    const key = k?.trim().toLowerCase();
    if (key && !skip.has(key)) cookies[k.trim()] = vs.join('=').trim();
  });
  return cookies;
}

export const CookieStore = {
  async get(url: string): Promise<string> {
    const domain = getDomain(url);
    try {
      const stored = localStorage.getItem(COOKIE_PREFIX + domain);
      if (!stored) return '';
      const obj: Record<string, string> = JSON.parse(stored);
      return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('; ');
    } catch { return ''; }
  },

  async save(url: string, setCookieHeaders: string[]): Promise<void> {
    const domain = getDomain(url);
    try {
      const stored = localStorage.getItem(COOKIE_PREFIX + domain);
      const existing: Record<string, string> = stored ? JSON.parse(stored) : {};
      for (const header of setCookieHeaders) Object.assign(existing, parseCookieHeader(header));
      localStorage.setItem(COOKIE_PREFIX + domain, JSON.stringify(existing));
    } catch { /* ignore */ }
  },

  async set(url: string, cookies: string): Promise<void> {
    const domain = getDomain(url);
    const parsed = parseCookieHeader(cookies);
    try {
      const stored = localStorage.getItem(COOKIE_PREFIX + domain);
      const existing: Record<string, string> = stored ? JSON.parse(stored) : {};
      Object.assign(existing, parsed);
      localStorage.setItem(COOKIE_PREFIX + domain, JSON.stringify(existing));
    } catch { /* ignore */ }
  },

  async clear(url: string): Promise<void> {
    localStorage.removeItem(COOKIE_PREFIX + getDomain(url));
  },
};
