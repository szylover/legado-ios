/**
 * AnalyzeByRegex — 正则规则
 * 对应 legado 的 ##regex##replacement 后缀语法
 */

export class AnalyzeByRegex {
  /**
   * 应用正则替换
   * @param src 输入字符串
   * @param pattern 正则表达式字符串
   * @param replacement 替换字符串（$1, $2 等反向引用）
   */
  static replace(src: string, pattern: string, replacement: string): string {
    try {
      const re = new RegExp(pattern, 'g');
      return src.replace(re, replacement);
    } catch {
      return src;
    }
  }

  /**
   * 提取第一个匹配
   * @param src 输入字符串
   * @param pattern 正则
   * @param groupIndex 捕获组索引，默认 0（整个匹配）
   */
  static match(src: string, pattern: string, groupIndex = 0): string {
    try {
      const re = new RegExp(pattern);
      const m = src.match(re);
      if (!m) return '';
      return m[groupIndex] ?? '';
    } catch {
      return '';
    }
  }

  /** 提取所有匹配列表 */
  static matchAll(src: string, pattern: string, groupIndex = 0): string[] {
    try {
      const re = new RegExp(pattern, 'g');
      const results: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        results.push(m[groupIndex] ?? m[0]);
      }
      return results;
    } catch {
      return [];
    }
  }
}
