# 设计文档：规则解析器（RuleAnalyzer + AnalyzeRule）
任务：T0010  
日期：2026-04-28

## 概述

legado 书源规则字符串支持多种解析语法混合使用。RuleAnalyzer 负责将规则字符串分段，AnalyzeRule 根据段的前缀调用对应解析器。

## 规则语法

legado 规则字符串语法（对应 `RuleAnalyzer.kt`）：

| 前缀 | 解析器 | 示例 |
|------|--------|------|
| `@@` | XPath | `@@//div[@class='title']` |
| `@css:` | CSS（显式） | `@css:div.title` |
| 无 `@@`/`.` 前缀 | CSS selector | `div.title` |
| `$.` / `$[` | JSONPath | `$.data.list[*].name` |
| `@XPath:` | XPath（显式） | `@XPath://div` |
| `<js>...</js>` | JS eval | `<js>result.replace('a','b')</js>` |
| `@js:` | JS eval（单行） | `@js:result.trim()` |
| `##` | 正则替换 | `##(\d+)##$1` |
| `@` | 多规则连接 | `div.list@a` |

## 分段逻辑（对应 `RuleAnalyzer.kt`）

```
输入规则字符串
  → 按 || 分割为多个候选规则（取第一个成功的）
  → 每个候选规则按 @ 分割为多级规则
  → 每级规则判断类型并交给对应解析器
  → 上一级结果作为下一级的输入
```

## 实现方案（@Dev）

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/core/ruleEngine/RuleAnalyzer.ts` | 规则字符串分段器 |
| `src/core/ruleEngine/AnalyzeByCSS.ts` | CSS 选择器（cheerio） |
| `src/core/ruleEngine/AnalyzeByXPath.ts` | XPath（xpath + xmldom） |
| `src/core/ruleEngine/AnalyzeByJSONPath.ts` | JSONPath（jsonpath-plus） |
| `src/core/ruleEngine/AnalyzeByRegex.ts` | 正则替换 |
| `src/core/ruleEngine/JSEngine.ts` | JS eval 沙箱 |
| `src/core/ruleEngine/AnalyzeRule.ts` | 主入口，组合所有解析器 |
| `src/core/ruleEngine/index.ts` | 统一导出 |

## 关键算法

```typescript
// AnalyzeRule.getString(rule, content) 伪代码
function getString(rule: string, content: string): string {
  const candidates = rule.split('||')  // 多候选，取第一个成功的
  for (const candidate of candidates) {
    try {
      const result = evalCandidate(candidate.trim(), content)
      if (result) return result
    } catch {}
  }
  return ''
}

function evalCandidate(rule: string, content: string): string {
  // 按 @ 分割多级（注意 @@ 和 @css: 不是分隔符）
  const parts = splitByAt(rule)
  let result: any = content
  for (const part of parts) {
    result = evalSingleRule(part, result)
  }
  return applyReplaceRegex(rule, result)
}
```

## 验收标准

- [ ] CSS 规则 `div.title` 能从 HTML 提取文本
- [ ] XPath 规则 `@@//div[@class='title']` 能提取
- [ ] JSONPath `$.data.list[*].name` 能从 JSON 提取列表
- [ ] `<js>result.replace('a','b')</js>` 能执行
- [ ] 多级规则 `ul.list@li@a` 能级联
- [ ] `||` 候选降级机制正常
- [ ] `##regex##replacement` 替换正常
