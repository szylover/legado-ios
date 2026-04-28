/**
 * AnalyzeByXPath — XPath 解析器
 * 对应 legado Android: AnalyzeByXPath.kt
 * 使用 xpath + xmldom
 */

import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';

export class AnalyzeByXPath {
  private doc: Document;

  constructor(html: string) {
    this.doc = new DOMParser({
      locator: {},
      errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
    }).parseFromString(html, 'text/html');
  }

  /** 获取节点列表 */
  getElements(xpathRule: string): Node[] {
    try {
      const result = xpath.select(xpathRule, this.doc as unknown as Node);
      if (Array.isArray(result)) return result as Node[];
      return [];
    } catch {
      return [];
    }
  }

  /** 获取字符串列表 */
  getStringList(xpathRule: string): string[] {
    try {
      const result = xpath.select(xpathRule, this.doc as unknown as Node);
      if (typeof result === 'string') return result ? [result.trim()] : [];
      if (typeof result === 'number' || typeof result === 'boolean') return [String(result)];
      if (Array.isArray(result)) {
        return (result as Node[])
          .map((n) => (n as Node & { textContent?: string }).textContent?.trim() ?? '')
          .filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }

  /** 获取单个字符串 */
  getString(xpathRule: string): string {
    return this.getStringList(xpathRule)[0] ?? '';
  }
}
