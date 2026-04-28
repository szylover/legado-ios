/**
 * AnalyzeUrl — URL 模板解析器
 * 对应 legado Android: AnalyzeUrl.kt
 *
 * 支持：
 *  - {{js}} 内嵌 JS 表达式
 *  - <pg> 翻页占位符
 *  - searchKey / searchPage 变量替换
 *  - URL 尾部 ,{...} JSON 参数（method/header/body/charset）
 */

import { JSEngine } from '../ruleEngine/JSEngine';

export type HttpMethod = 'GET' | 'POST';

export interface ParsedUrl {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  charset?: string;
  retry: number;
  useWebView: boolean;
  webJs?: string;
}

export interface UrlContext {
  key?: string;        // 搜索关键字
  page?: number;       // 页码（1-based）
  baseUrl?: string;
  [key: string]: unknown;
}

/** URL 尾部参数 JSON 格式 */
interface UrlOption {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  charset?: string;
  retry?: number;
  webView?: string | boolean;
  webJs?: string;
  js?: string;
}

const DEFAULT_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export class AnalyzeUrl {
  private rawUrl: string;
  private ctx: UrlContext;

  constructor(rawUrl: string, ctx: UrlContext = {}) {
    this.rawUrl = rawUrl;
    this.ctx = ctx;
  }

  parse(): ParsedUrl {
    let ruleUrl = this.rawUrl;

    // Step 1: 执行 <js>...</js> 和 @js: 前缀
    ruleUrl = this.evalJsTags(ruleUrl);

    // Step 2: 替换 {{js 表达式}}
    ruleUrl = this.evalInlineJs(ruleUrl);

    // Step 3: 替换翻页占位符 <pg,1,2,3> 或 <pg>
    ruleUrl = this.replacePage(ruleUrl);

    // Step 4: 替换 searchKey / searchPage / key
    ruleUrl = this.replaceVariables(ruleUrl);

    // Step 5: 拆分 URL 主体 和 尾部 ,{...} JSON 参数
    return this.splitUrlAndOptions(ruleUrl);
  }

  private evalJsTags(url: string): string {
    // 匹配 @js:xxx 到行尾 或 <js>...</js>
    const jsTagRe = /<js>([\s\S]*?)<\/js>|@js:([\s\S]+)$/gi;
    return url.replace(jsTagRe, (_, block, inline) => {
      const code = block ?? inline;
      return JSEngine.evalString(code.trim(), { ...this.ctx, result: url });
    });
  }

  private evalInlineJs(url: string): string {
    if (!url.includes('{{')) return url;
    return url.replace(/\{\{([\s\S]*?)\}\}/g, (_, code) => {
      const result = JSEngine.evalString(code.trim(), { ...this.ctx, result: '' });
      return result;
    });
  }

  private replacePage(url: string): string {
    const page = this.ctx.page ?? 1;
    // <pg,p1,p2,...> → 按页码索引取值
    url = url.replace(/<pg,([^>]+)>/gi, (_, options) => {
      const parts = options.split(',').map((s: string) => s.trim());
      return parts[page - 1] ?? parts[parts.length - 1] ?? String(page);
    });
    // 简单 <pg> → 直接替换页码
    url = url.replace(/<pg>/gi, String(page));
    return url;
  }

  private replaceVariables(url: string): string {
    const key = this.ctx.key ?? '';
    const page = this.ctx.page ?? 1;
    return url
      .replace(/searchKey/g, encodeURIComponent(key))
      .replace(/searchPage/g, String(page))
      .replace(/\bkey\b/g, encodeURIComponent(key))
      .replace(/\bpage\b/g, String(page));
  }

  private splitUrlAndOptions(ruleUrl: string): ParsedUrl {
    // 末尾 ,{...} 参数（取最后一个 ,{ 位置）
    const optionStart = findOptionsStart(ruleUrl);
    const urlPart = optionStart !== -1 ? ruleUrl.slice(0, optionStart).trim() : ruleUrl.trim();
    const optionStr = optionStart !== -1 ? ruleUrl.slice(optionStart + 1).trim() : null;

    const result: ParsedUrl = {
      url: urlPart,
      method: 'GET',
      headers: { 'User-Agent': DEFAULT_UA },
      retry: 0,
      useWebView: false,
    };

    if (optionStr) {
      try {
        const opt: UrlOption = JSON.parse(optionStr);
        if (opt.method?.toUpperCase() === 'POST') result.method = 'POST';
        if (opt.headers) Object.assign(result.headers, opt.headers);
        if (opt.body) result.body = opt.body;
        if (opt.charset) result.charset = opt.charset;
        if (opt.retry) result.retry = opt.retry;
        if (opt.webView) result.useWebView = true;
        if (opt.webJs) result.webJs = opt.webJs;
        if (opt.js) {
          result.url = JSEngine.evalString(opt.js, { ...this.ctx, result: result.url });
        }
      } catch {
        // 非法 JSON，忽略
      }
    }

    return result;
  }
}

/** 找到最后一个 ,{ 的位置（URL 末尾参数的起始） */
function findOptionsStart(url: string): number {
  // 从末尾向前找 ,{
  for (let i = url.length - 1; i >= 0; i--) {
    if (url[i] === '{') {
      if (i > 0 && url[i - 1] === ',') return i - 1;
    }
  }
  return -1;
}
