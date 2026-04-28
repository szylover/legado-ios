/**
 * RuleAnalyzer — 规则字符串分段器
 * 对应 legado Android: RuleAnalyzer.kt
 *
 * 规则语法示例：
 *   "ul.list@li@a"        → CSS 多级
 *   "@@//ul/li/a"         → XPath
 *   "$.data[*].name"      → JSONPath
 *   "<js>result.trim()</js>" → JS eval
 *   "rule1||rule2"        → 候选（取第一个成功）
 *   "##regex##replace"    → 正则替换后缀
 */

export interface ParsedRule {
  /** 规则类型 */
  type: 'css' | 'xpath' | 'jsonpath' | 'regex' | 'js' | 'default';
  /** 去掉前缀后的规则内容 */
  value: string;
  /** 正则替换后缀 (##pattern##replace) */
  replaceRegex?: string;
  replaceWith?: string;
}

export interface RuleSegment {
  /** 多候选规则（|| 分隔，取第一个成功的） */
  candidates: ParsedRule[][];
}

const JS_TAG_RE = /^<js>([\s\S]*?)<\/js>$|^@js:([\s\S]+)$/i;
const REPLACE_SUFFIX_RE = /##([^#]*)(?:##(.*))?$/;

/**
 * 将单段规则解析为 ParsedRule
 */
export function parseSingleRule(raw: string): ParsedRule {
  const trimmed = raw.trim();

  // 提取 ##regex##replace 后缀
  let replaceRegex: string | undefined;
  let replaceWith: string | undefined;
  let rule = trimmed;
  const replaceSuffixMatch = trimmed.match(REPLACE_SUFFIX_RE);
  if (replaceSuffixMatch) {
    replaceRegex = replaceSuffixMatch[1];
    replaceWith = replaceSuffixMatch[2] ?? '';
    rule = trimmed.slice(0, trimmed.indexOf('##')).trim();
  }

  const base: Omit<ParsedRule, 'type' | 'value'> = {
    ...(replaceRegex !== undefined ? { replaceRegex, replaceWith } : {}),
  };

  // JS: <js>...</js> 或 @js:...
  const jsMatch = rule.match(JS_TAG_RE);
  if (jsMatch) {
    return { ...base, type: 'js', value: (jsMatch[1] ?? jsMatch[2]).trim() };
  }

  // XPath: @@ 前缀 或 @XPath: 前缀（不区分大小写）
  if (rule.startsWith('@@') || /^@xpath:/i.test(rule)) {
    const value = rule.startsWith('@@') ? rule.slice(2) : rule.replace(/^@xpath:/i, '');
    return { ...base, type: 'xpath', value: value.trim() };
  }

  // JSONPath: $. 或 $[
  if (rule.startsWith('$.') || rule.startsWith('$[')) {
    return { ...base, type: 'jsonpath', value: rule };
  }

  // CSS: @css: 前缀
  if (/^@css:/i.test(rule)) {
    return { ...base, type: 'css', value: rule.replace(/^@css:/i, '').trim() };
  }

  // 默认：CSS selector（legado 默认用 JSoup/CSS）
  return { ...base, type: 'default', value: rule };
}

/**
 * 按 @ 分割多级规则（避免切 @@ / @css: / @xpath: / @js:）
 *
 * 规则：@ 作为分隔符，但 @@、@css:、@xpath:、@js: 开头的不切
 */
export function splitByAt(rule: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let i = 0;

  while (i < rule.length) {
    if (rule[i] === '@') {
      // 检查是否是保护前缀
      const remaining = rule.slice(i);
      if (
        remaining.startsWith('@@') ||
        /^@css:/i.test(remaining) ||
        /^@xpath:/i.test(remaining) ||
        /^@js:/i.test(remaining)
      ) {
        // 这是规则内容的一部分，跳过
        i += remaining.startsWith('@@') ? 2 : remaining.indexOf(':') + 1;
        continue;
      }
      // 普通 @ 分隔符
      const segment = rule.slice(start, i).trim();
      if (segment) parts.push(segment);
      start = i + 1;
    }
    i++;
  }
  const last = rule.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

/**
 * 完整解析规则字符串
 * 支持 || 候选 + @ 多级
 */
export function parseRule(ruleStr: string): RuleSegment {
  const candidateStrings = ruleStr.split('||');
  const candidates = candidateStrings.map((candidate) => {
    const parts = splitByAt(candidate.trim());
    return parts.map(parseSingleRule);
  });
  return { candidates };
}
