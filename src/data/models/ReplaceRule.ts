// ReplaceRule.ts — matches legado Android ReplaceRule.kt

export interface ReplaceRule {
  id: number;
  name: string;
  group?: string;
  pattern: string;
  replacement: string;
  isRegex: boolean;
  /** 书源范围，逗号分隔的书源URL，空=全部 */
  scope?: string;
  scopeTitle?: boolean;
  scopeContent?: boolean;
  timeoutMillisecond?: number;
  enabled: boolean;
  order: number;
}
