/**
 * HttpClient — fetch 封装
 * Web 模式：外部请求经过本地 CORS 代理转发
 */

import type { ParsedUrl } from '@/model/analyzeRule/AnalyzeUrl';
import { CookieStore } from './CookieStore';

export interface HttpResponse {
  text: string;
  url: string;
  statusCode: number;
  headers: Record<string, string>;
}

export interface HttpOptions extends ParsedUrl {
  sourceHeader?: string | Record<string, string>;
  enableCookieJar?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/** 代理 URL：开发时走 :3001，生产 --serve 时同源 /proxy */
function proxyUrl(targetUrl: string): string {
  if (typeof window === 'undefined') return targetUrl;
  const base = window.location.port === '3000' ? '' : 'http://localhost:3001';
  return `${base}/proxy?url=${encodeURIComponent(targetUrl)}`;
}

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

  if (sourceHeader) {
    const srcHeaders = typeof sourceHeader === 'string'
      ? safeParseJson<Record<string, string>>(sourceHeader) : sourceHeader;
    if (srcHeaders) Object.assign(headers, srcHeaders);
  }

  if (enableCookieJar) {
    const cookie = await CookieStore.get(url);
    if (cookie) headers['Cookie'] = cookie;
  }

  if (method === 'POST' && body && !headers['Content-Type']) {
    headers['Content-Type'] = body.trimStart().startsWith('{')
      ? 'application/json' : 'application/x-www-form-urlencoded';
  }

  // Web: route through local CORS proxy
  const fetchUrl = proxyUrl(url);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(fetchUrl, {
        method, headers,
        body: method === 'POST' ? body : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (enableCookieJar) {
        const setCookies = (resp.headers as any).getAll?.('set-cookie') ?? [];
        if (setCookies.length) await CookieStore.save(url, setCookies);
      }

      const text = await resp.text();
      const respHeaders: Record<string, string> = {};
      resp.headers.forEach((v, k) => { respHeaders[k] = v; });
      return { text, url: resp.url || url, statusCode: resp.status, headers: respHeaders };
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
  return new Promise(r => setTimeout(r, ms));
}
