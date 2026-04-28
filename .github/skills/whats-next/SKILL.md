---
name: whats-next
description: "查看项目进度，推荐下一步任务。当用户说 下一步/what's next/能做什么/进度/现在做什么 时使用。"
argument-hint: "可选：指定关注分类，如 rule-engine/reader/bookshelf/booksource/network/data"
---

# What's Next — 推荐下一步任务

根据 roadmap 和 GitHub Issues 状态，给用户推荐当前可执行的任务。

## 执行步骤

### 1. 收集数据

同时执行：
1. **读取 roadmap** — `docs/roadmap.md`，解析任务状态（✅/📐/🔨/⬜）和前置依赖
2. **查询 GitHub Issues** — `gh issue list --repo <owner>/legado-ios --state open`

### 2. 分析可执行任务

对每个 ⬜（未开始）或 📐（设计完成）的任务，检查：
- 前置依赖是否全部 ✅
- 是否有对应 open Issue
- 是否已有 Design Spec（`docs/specs/` 下存在文件）

### 3. 输出格式

```markdown
## 📊 进度概览
- 总任务：XX | 已完成：XX (XX%) | 进行中：XX | 未开始：XX

## 🚀 现在可以做的

### 可直接实现（有 Spec）
| ID | 任务 | 分类 | Spec | Issue |

### 需要先设计（无 Spec）
| ID | 任务 | 分类 | 前置 | Issue |

## ⏳ 即将解锁（差 1-2 个前置）
| ID | 任务 | 缺少前置 | Issue |

## 💡 建议
推荐 1-3 个最值得优先做的任务，说明理由。
```

### 4. 额外检查

- roadmap 标 ✅ 但 Issue 仍 open → 提醒关闭 Issue
- roadmap 标 🔨 但无活跃分支 → 提醒确认状态
