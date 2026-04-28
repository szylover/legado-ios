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
    // xmldom DOMParser，容错模式
    this.doc = new DOMParser({
      locator: {},
      errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
    }).parseFromString(html, 'text/html');
  }

  /** 获取节点列表 */
  getElements(xpathRule: string): Node[] {
    try {
      const result = xpath.evaluate(
        xpathRule,
        this.doc,
        null,
        xpath.XPathResult.ANY_TYPE,
        null,
      );
      const nodes: Node[] = [];
      if (result.resultType === xpath.XPathResult.STRING_TYPE) {
        // 返回单个字符串时包装
        return [];
      }
      let node = result.iterateNext();
      while (node) {
        nodes.push(node);
        node = result.iterateNext();
      }
      return nodes;
    } catch {
      return [];
    }
  }

  /** 获取字符串列表 */
  getStringList(xpathRule: string): string[] {
    try {
      const result = xpath.evaluate(
        xpathRule,
        this.doc,
        null,
        xpath.XPathResult.ANY_TYPE,
        null,
      );
      // 字符串结果
      if (result.resultType === xpath.XPathResult.STRING_TYPE) {
        const s = result.stringValue;
        return s ? [s.trim()] : [];
      }
      const strings: string[] = [];
      let node = result.iterateNext();
      while (node) {
        const text = node.textContent?.trim() ?? '';
        if (text) strings.push(text);
        node = result.iterateNext();
      }
      return strings;
    } catch {
      return [];
    }
  }

  /** 获取单个字符串 */
  getString(xpathRule: string): string {
    return this.getStringList(xpathRule)[0] ?? '';
  }
}
