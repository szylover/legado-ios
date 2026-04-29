/**
 * AnalyzeByCSS — CSS 选择器解析器
 * 对应 legado Android: AnalyzeByJSoup.kt
 * 使用 cheerio 实现，支持 legado 扩展 CSS 语法：
 *   class.foo      → .foo
 *   tag.foo        → foo (tag selector)
 *   id.foo         → #foo
 *   tag.td.2       → td elements, take index 2
 *   class.item!0   → .item elements, exclude index 0
 */

import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

/**
 * 解析 legado 扩展选择器语法
 * 返回标准 CSS selector + 索引列表 + 排除索引
 */
function parseLegadoSelector(rule: string): {
  selector: string;
  indices: number[];
  exclude: number | null;
} {
  let r = rule.trim();
  let exclude: number | null = null;

  // Parse !N suffix (exclusion), e.g. "tag.tr!0" → exclude index 0
  const excludeMatch = r.match(/!(\d+)$/);
  if (excludeMatch) {
    exclude = parseInt(excludeMatch[1]);
    r = r.slice(0, r.length - excludeMatch[0].length);
  }

  let selector: string;
  let indices: number[] = [];

  if (r.startsWith('class.')) {
    // "class.item" → ".item"; "class.item.2" → ".item" then index 2
    const parts = r.slice(6).split('.');
    selector = '.' + parts[0];
    indices = parts.slice(1).map(Number).filter(n => !isNaN(n));
  } else if (r.startsWith('tag.')) {
    // "tag.td" → "td"; "tag.td.2" → "td" then index 2
    const parts = r.slice(4).split('.');
    selector = parts[0];
    indices = parts.slice(1).map(Number).filter(n => !isNaN(n));
  } else if (r.startsWith('id.')) {
    selector = '#' + r.slice(3);
  } else {
    // Standard CSS (including ":nth-child", ">", etc.)
    selector = r;
  }

  return { selector, indices, exclude };
}

export class AnalyzeByCSS {
  private $: cheerio.CheerioAPI;
  private root: cheerio.Cheerio<AnyNode>;

  constructor(html: string) {
    this.$ = cheerio.load(html, { xml: false } as cheerio.CheerioOptions);
    this.root = this.$.root();
  }

  /**
   * 获取元素列表（支持 legado 扩展语法）
   * scope 可指定在哪个父元素内搜索
   */
  getElements(rule: string, scope?: cheerio.Cheerio<AnyNode>): cheerio.Cheerio<Element>[] {
    try {
      const { selector, indices, exclude } = parseLegadoSelector(rule);
      const base = scope ?? this.root;
      const found = base.find(selector);

      let items: Element[] = [];
      found.each((_, el) => { items.push(el as Element); });

      // Apply sequential index selection (e.g., tag.td.2 → keep only index 2)
      for (const idx of indices) {
        if (idx < items.length) {
          items = [items[idx]];
        } else {
          items = [];
          break;
        }
      }

      // Apply exclusion (e.g., !0 → remove first element)
      if (exclude !== null) {
        items = items.filter((_, i) => i !== exclude);
      }

      return items.map(el => this.$(el) as cheerio.Cheerio<Element>);
    } catch {
      return [];
    }
  }

  /** 按选择器获取单个字符串 */
  getString(rule: string): string {
    return this.getStringList(rule)[0] ?? '';
  }

  /**
   * 获取文本/属性值列表。
   * 当 CSS 选择器匹配为空且 rule 是纯标识符时（如 "href"/"src"/"text"），
   * fallback 为从根元素取属性或特殊属性——用于多级规则最后一步的属性提取。
   */
  getStringList(rule: string): string[] {
    const matched = this.getElements(rule);
    if (matched.length > 0) {
      return matched.map(el => this.getTextFromElement(el, rule));
    }
    // Attribute / special-prop fallback for identifiers like "href", "src", "text"
    if (/^[a-zA-Z][a-zA-Z0-9_:-]*$/.test(rule)) {
      const el = this.root.find('body').children().first();
      if (el.length) {
        if (rule === 'text') return [el.text().trim()].filter(Boolean);
        if (rule === 'html' || rule === 'innerhtml') return [el.html() ?? ''].filter(Boolean);
        if (rule === 'outerhtml') return [this.$.html(el as any) ?? ''].filter(Boolean);
        const attr = el.attr(rule);
        if (attr !== undefined) return [attr];
      }
    }
    return [];
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
  getStringFromElement(el: cheerio.Cheerio<Element>, rule: string): string {
    const atMatch = rule.match(/@([a-zA-Z_:][a-zA-Z0-9_:\-.]*)$/);
    if (atMatch) {
      const attr = atMatch[1].toLowerCase();
      if (attr === 'html' || attr === 'innerhtml') return el.html() ?? '';
      if (attr === 'text') return el.text().trim();
      if (attr === 'outerhtml') return this.$.html(el as any) ?? '';
      // Find child matching selectorPart, then get attribute from it (or el itself)
      const selectorPart = rule.slice(0, rule.lastIndexOf('@')).trim();
      if (selectorPart) {
        const child = el.find(selectorPart);
        const target = child.length ? child.first() : el;
        return target.attr(atMatch[1]) ?? '';
      }
      return el.attr(atMatch[1]) ?? '';
    }
    const selectorPart = rule.replace(/@[^@]*$/, '').trim();
    if (selectorPart) {
      const child = el.find(selectorPart);
      if (child.length) return child.first().text().trim();
    }
    return el.text().trim();
  }

  private getTextFromElement(el: cheerio.Cheerio<Element>, rule: string): string {
    return this.getStringFromElement(el, rule);
  }

  /** 获取第一个匹配元素的 outerHTML（中间步骤用，保留 HTML 上下文） */
  getFirstElementOuterHtml(rule: string): string {
    return this.getOuterHtmlList(rule)[0] ?? '';
  }

  /** 获取每个匹配元素的 outerHTML（bookList / chapterList 拆分用） */
  getOuterHtmlList(rule: string): string[] {
    return this.getElements(rule).map(el => this.$.html(el) ?? '');
  }

  /** 获取 HTML 字符串（用于下一级规则） */
  getHtml(rule?: string): string {
    if (!rule) return this.$.html() ?? '';
    const el = this.root.find(rule).first();
    return el.html() ?? '';
  }
}

