/**
 * AnalyzeByJSONPath — JSONPath 解析器
 * 对应 legado Android: AnalyzeByJSonPath.kt
 * 使用 jsonpath-plus
 */

import { JSONPath } from 'jsonpath-plus';

export class AnalyzeByJSONPath {
  private data: unknown;

  constructor(jsonOrObject: string | unknown) {
    if (typeof jsonOrObject === 'string') {
      try {
        this.data = JSON.parse(jsonOrObject);
      } catch {
        this.data = jsonOrObject;
      }
    } else {
      this.data = jsonOrObject;
    }
  }

  /** 获取字符串列表 */
  getStringList(rule: string): string[] {
    try {
      const result = JSONPath({ path: rule, json: this.data as object });
      if (!Array.isArray(result)) return result != null ? [String(result)] : [];
      return result.map((item) => (item != null ? String(item) : '')).filter(Boolean);
    } catch {
      return [];
    }
  }

  /** 获取单个字符串 */
  getString(rule: string): string {
    return this.getStringList(rule)[0] ?? '';
  }

  /** 获取原始值（数组/对象，用于下一级规则） */
  getObject(rule: string): unknown {
    try {
      const result = JSONPath({ path: rule, json: this.data as object });
      if (Array.isArray(result) && result.length === 1) return result[0];
      return result;
    } catch {
      return null;
    }
  }
}
