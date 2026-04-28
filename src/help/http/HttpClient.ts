/**
 * HttpClient — fetch 封装
 * 对应 legado Android: OkHttp 封装
 *
 * 功能：
 *  - 自动携带/保存 Cookie（CookieStore）
 *  - 自定义 Headers（书源 header 字段）
 *  - 重试
 *  - 响应 charset 自动检测
 *  - GET / POST（form / json）
 */

import { ParsedUrl } from './AnalyzeUrl';
import { CookieStore } from '@/help/http/CookieStore';

export interface HttpResponse {
  text: string;
  url: string;
  statusCode: number;
  headers: Record<string, string>;
}

export interface HttpOptions extends ParsedUrl {
  /** 额外 Headers（书源 header 字段，JSON 字符串或对象） */
  sourceHeader?: string | Record<string, string>;
  /** 是否启用 CookieJar */
  enableCookieJar?: boolean;
  /** 超时毫秒 */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function httpFetch(options: HttpOptions): Promise<HttpResponse> {
  const {
    url,
    method,
    headers: parsedHeaders,
    body,
    sourceHeader,
    enableCookieJar = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retry = 0,
  } = options;

  const headers: Record<string, string> = { ...parsedHeaders };

  // 合并书源 header
  if (sourceHeader) {
    const srcHeaders =
      typeof sourceHeader === 'string' ? safeParseJson<Record<string, string>>(sourceHeader) : sourceHeader;
    if (srcHeaders) Object.assign(headers, srcHeaders);
  }

  // 携带 Cookie
  if (enableCookieJar) {
    const cookie = await CookieStore.get(url);
    if (cookie) headers['Cookie'] = cookie;
  }

  // POST body content-type
  if (method === 'POST' && body && !headers['Content-Type']) {
    headers['Content-Type'] = body.trimStart().startsWith('{')
      ? 'application/json'
      : 'application/x-www-form-urlencoded';
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // 保存 Cookie
      if (enableCookieJar) {
        const setCookies = resp.headers.getAll?.('set-cookie') ?? [];
        if (setCookies.length) await CookieStore.save(url, setCookies);
      }

      const text = await resp.text();
      const respHeaders: Record<string, string> = {};
      resp.headers.forEach((v, k) => { respHeaders[k] = v; });

      return {
        text,
        url: resp.url || url,
        statusCode: resp.status,
        headers: respHeaders,
      };
    } catch (e) {
      lastError = e as Error;
      if (attempt < retry) await sleep(500 * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Request failed: ${url}`);
}

function safeParseJson<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
