---
description: "Merge checklist + git workflow. Use when user says 提交/commit/push/PR/merge/发布/ship/上线."
mode: "agent"
tools: [read, edit, search, execute]
---

执行 legado iOS 项目的合并前检查和 Git 工作流。

## 前置：判断变更类型

- **纯文档变更**（`docs/`、`.github/`）→ 分支前缀 `chore/`
- **代码变更**（`src/`、`app/`）→ 分支前缀 `feat/` 或 `fix/`
- **发布/配置**（`app.json`、`eas.json`）→ 分支前缀 `release/`
- **文档与代码禁止混在同一 PR**

## 步骤

### 1. 类型检查

```bash
npx tsc --noEmit
```

必须无报错。

### 2. 检查清单

- [ ] **关闭 GitHub Issue**：`gh issue close <number> --reason completed`
- [ ] **`docs/roadmap.md`**：完成的任务状态改为 ✅
- [ ] **`.github/copilot-instructions.md`**：如目录结构变化则更新

### 3. Git 工作流

```bash
# 确认当前分支
git branch

# 如果在 main，先建分支
git checkout -b feat/T0XXX-描述

# 提交
git add -A
git commit -m "feat(T0XXX): 描述

- 改动要点 1
- 改动要点 2

Closes #Issue编号"

# 推送并创建 PR
git push -u origin <分支名>
gh pr create --base main --title "feat(T0XXX): 描述" --body "改动要点"
```

### 4. OTA 更新（如果只是 JS 变更）

```bash
# 不需要 Mac，直接推送
eas update --branch production --message "feat(T0XXX): 描述"
```

### 5. 合并

```bash
gh pr merge <编号> --squash --delete-branch
git checkout main && git pull
```

### 6. 输出

给用户 PR 链接 + 简要变更总结。
