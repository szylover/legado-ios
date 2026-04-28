/**
 * AnalyzeRule — 主规则入口
 * 对应 legado Android: AnalyzeRule.kt
 *
 * 根据规则字符串自动选择 CSS / XPath / JSONPath / Regex / JS 解析器，
 * 支持多级规则（@ 连接）和候选规则（|| 分隔）。
 */

import { parseRule, parseSingleRule, splitByAt } from './RuleAnalyzer';
import { AnalyzeByCSS } from './AnalyzeByJSoup';
import { AnalyzeByXPath } from './AnalyzeByXPath';
import { AnalyzeByJSONPath } from './AnalyzeByJSonPath';
import { AnalyzeByRegex } from './AnalyzeByRegex';
import { JSEngine, JSContext } from './JSEngine';

export class AnalyzeRule {
  private content: unknown;
  private baseUrl: string;
  private jsContext: JSContext;

  constructor(content: unknown, baseUrl = '', jsContext: JSContext = {}) {
    this.content = content;
    this.baseUrl = baseUrl;
    this.jsContext = { ...jsContext, baseUrl };
  }

  setContent(content: unknown, baseUrl?: string) {
    this.content = content;
    if (baseUrl) this.baseUrl = baseUrl;
    return this;
  }

  // ─── 公开接口 ────────────────────────────────────────────────

  /** 获取单个字符串 */
  getString(rule: string): string {
    if (!rule?.trim()) return '';
    return this.getStringList(rule)[0] ?? '';
  }

  /** 获取字符串列表 */
  getStringList(rule: string): string[] {
    if (!rule?.trim()) return [];

    // || 候选：取第一个非空结果
    const candidates = rule.split('||');
    for (const candidate of candidates) {
      try {
        const result = this.evalCandidate(candidate.trim());
        if (result.length > 0) return result;
      } catch {
        continue;
      }
    }
    return [];
  }

  // ─── 私有实现 ─────────────────────────────────────────────────

  private evalCandidate(rule: string): string[] {
    // 按 @ 分割多级规则
    const parts = splitByAt(rule);
    let current: unknown = this.content;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      current = this.evalSinglePart(part, current, isLast);
    }

    // 最终处理成字符串列表
    return this.toStringList(current);
  }

  private evalSinglePart(rule: string, input: unknown, returnList: boolean): unknown {
    const parsed = parseSingleRule(rule);
    let result: unknown;

    switch (parsed.type) {
      case 'js': {
        result = JSEngine.evalString(parsed.value, { ...this.jsContext, result: input });
        break;
      }
      case 'xpath': {
        const html = this.toHtml(input);
        const analyzer = new AnalyzeByXPath(html);
        result = returnList ? analyzer.getStringList(parsed.value) : analyzer.getString(parsed.value);
        break;
      }
      case 'jsonpath': {
        const analyzer = new AnalyzeByJSONPath(input);
        result = returnList ? analyzer.getStringList(parsed.value) : analyzer.getString(parsed.value);
        break;
      }
      case 'css':
      case 'default': {
        // 自动检测：如果 input 是 JSON，用 JSONPath 兜底
        if (this.isJson(input)) {
          const analyzer = new AnalyzeByJSONPath(input);
          result = returnList ? analyzer.getStringList(parsed.value) : analyzer.getString(parsed.value);
        } else {
          const html = this.toHtml(input);
          const analyzer = new AnalyzeByCSS(html);
          result = returnList ? analyzer.getStringList(parsed.value) : analyzer.getString(parsed.value);
        }
        break;
      }
      default:
        result = input;
    }

    // 应用 ##regex##replace 后缀
    if (parsed.replaceRegex !== undefined) {
      const str = Array.isArray(result) ? result.join('') : String(result ?? '');
      result = AnalyzeByRegex.replace(str, parsed.replaceRegex, parsed.replaceWith ?? '');
    }

    return result;
  }

  private toStringList(value: unknown): string[] {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.map((v) => String(v ?? '')).filter(Boolean);
    const s = String(value).trim();
    return s ? [s] : [];
  }

  private toHtml(input: unknown): string {
    if (typeof input === 'string') return input;
    if (input === null || input === undefined) return '';
    return String(input);
  }

  private isJson(input: unknown): boolean {
    if (typeof input !== 'string') return typeof input === 'object';
    const s = input.trim();
    return s.startsWith('{') || s.startsWith('[');
  }
}
