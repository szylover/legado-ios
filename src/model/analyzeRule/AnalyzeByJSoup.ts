/**
 * AnalyzeByCSS — CSS 选择器解析器
 * 对应 legado Android: AnalyzeByJSoup.kt
 * 使用 cheerio 实现
 */

import * as cheerio from 'cheerio';

export class AnalyzeByCSS {
  private $: cheerio.CheerioAPI;
  private root: cheerio.Cheerio<cheerio.AnyNode>;

  constructor(html: string) {
    this.$ = cheerio.load(html, { decodeEntities: false });
    this.root = this.$.root();
  }

  /** 获取元素列表（对应 getElements） */
  getElements(rule: string): cheerio.Cheerio<cheerio.Element>[] {
    try {
      const elements = this.root.find(rule);
      const result: cheerio.Cheerio<cheerio.Element>[] = [];
      elements.each((_, el) => {
        result.push(this.$(el));
      });
      return result;
    } catch {
      return [];
    }
  }

  /** 从 elements 中按规则获取文本列表 */
  getStringList(rule: string, elements?: cheerio.Cheerio<cheerio.Element>[]): string[] {
    const src = elements ?? this.getElements(rule);
    if (!elements) {
      // rule 本身就是选择器，取文本
      return this.getElements(rule).map((el) => this.getTextFromElement(el, rule));
    }
    return src.map((el) => this.getTextFromElement(el, rule));
  }

  /** 按选择器获取单个字符串 */
  getString(rule: string): string {
    return this.getStringList(rule)[0] ?? '';
  }

  /**
   * 从单个元素按 rule 取值
   * rule 可包含属性后缀：
   *   "a@href"    → 取 href 属性
   *   "img@src"   → 取 src 属性
   *   "div"       → 取 text()
   *   "div@html"  → 取 innerHTML
   *   "div@text"  → 取 text()
   */
  getStringFromElement(el: cheerio.Cheerio<cheerio.Element>, rule: string): string {
    // 拆出属性后缀 @attr
    const atMatch = rule.match(/@([a-zA-Z_:][a-zA-Z0-9_:\-.]*)$/);
    if (atMatch) {
      const attr = atMatch[1].toLowerCase();
      if (attr === 'html' || attr === 'innerhtml') return el.html() ?? '';
      if (attr === 'text') return el.text().trim();
      if (attr === 'outerhtml') return cheerio.load(el.toString()).html() ?? '';
      return el.attr(atMatch[1]) ?? '';
    }
    // 没有属性后缀，先找子元素，找不到就取当前元素文本
    const selectorPart = rule.replace(/@[^@]*$/, '').trim();
    if (selectorPart) {
      const child = el.find(selectorPart);
      if (child.length) return child.first().text().trim();
    }
    return el.text().trim();
  }

  private getTextFromElement(el: cheerio.Cheerio<cheerio.Element>, rule: string): string {
    return this.getStringFromElement(el, rule);
  }

  /** 获取 HTML 字符串（用于下一级规则） */
  getHtml(rule?: string): string {
    if (!rule) return this.$.html() ?? '';
    const el = this.root.find(rule).first();
    return el.html() ?? '';
  }
}
