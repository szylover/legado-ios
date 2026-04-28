/**
 * JSEngine — 书源 JS 规则执行引擎
 * 对应 legado Android: RhinoScriptEngine (Rhino JS)
 *
 * React Native 中 JS 运行在同一 JS 引擎（Hermes/V8），
 * 直接用 Function 构造器实现 eval 沙箱，无需额外依赖。
 *
 * 书源 JS 中常用的 java 对象在 legado 里由 JsExtensions 提供，
 * 这里实现对应的 JS 替代品注入到沙箱 context。
 */

export interface JSContext {
  result?: unknown;
  baseUrl?: string;
  chapter?: Record<string, unknown>;
  book?: Record<string, unknown>;
  source?: Record<string, unknown>;
  /** 页码 */
  page?: number;
  /** 搜索关键字 */
  key?: string;
}

/** 注入到书源 JS 沙箱的工具函数 */
const JS_EXTENSIONS = `
// legado JsExtensions 的 JS 等价实现
const java = {
  encodeBase64: (s) => btoa(unescape(encodeURIComponent(s))),
  decodeBase64: (s) => decodeURIComponent(escape(atob(s))),
  encodeUrl: (s) => encodeURIComponent(s),
  decodeUrl: (s) => decodeURIComponent(s),
  md5: () => '',  // placeholder
};

const base64Encode = (s) => java.encodeBase64(s);
const base64Decode = (s) => java.decodeBase64(s);
const encodeUrl = (s) => java.encodeUrl(s);
const decodeUrl = (s) => java.decodeUrl(s);

// 简单的 log
const log = (...args) => console.log('[JSEngine]', ...args);
`;

export class JSEngine {
  /**
   * 执行书源 JS 规则
   * @param code JS 代码字符串
   * @param context 注入的上下文变量（result, baseUrl, page, key 等）
   * @returns JS 执行结果
   */
  static eval(code: string, context: JSContext = {}): unknown {
    try {
      // 构建参数列表：注入 context 中所有变量
      const keys = Object.keys(context);
      const values = Object.values(context);

      const wrappedCode = `
${JS_EXTENSIONS}
${keys.map((k) => `var ${k} = __ctx__["${k}"];`).join('\n')}
${code}
`;
      // eslint-disable-next-line no-new-func
      const fn = new Function('__ctx__', wrappedCode);
      const result = fn({ ...context });
      // 如果代码没有显式 return，尝试取 result 变量
      return result !== undefined ? result : context.result;
    } catch (e) {
      console.warn('[JSEngine] eval error:', e);
      return context.result ?? '';
    }
  }

  /**
   * 执行并确保返回字符串
   */
  static evalString(code: string, context: JSContext = {}): string {
    const result = JSEngine.eval(code, context);
    if (result === null || result === undefined) return '';
    if (typeof result === 'object') return JSON.stringify(result);
    return String(result);
  }
}
