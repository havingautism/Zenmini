# Git 分支保护策略指南

## 推荐的分支策略

### 分支结构
- **main** - 生产分支（稳定版本）
- **dev-fancy** - 开发分支（新功能开发）

## 设置步骤

### 1. 访问分支保护设置
```
https://github.com/havingautism/gemini_chat/settings/branches
```

---

## main 分支保护规则

### 基础保护
1. **Require a pull request before merging** ✅
   - 必须通过 PR 才能合并到 main
   - ✅ Require approvals: 1（如果是个人项目可以不勾选）
   - ✅ Dismiss stale pull request approvals when new commits are pushed

2. **Require status checks to pass before merging** ✅
   - ✅ Require branches to be up to date before merging
   - 添加必需的检查：
     - `build` (来自 Deploy workflow)

3. **Require conversation resolution before merging** ✅
   - 确保所有评论都被解决

4. **Require linear history** ✅（可选）
   - 保持干净的提交历史

5. **Do not allow bypassing the above settings** ✅
   - 管理员也必须遵守规则（推荐）

### 其他设置
- ❌ Allow force pushes（禁止强制推送）
- ❌ Allow deletions（禁止删除分支）

---

## dev-fancy 分支保护规则

### 基础保护（相对宽松）
1. **Require a pull request before merging** ❌
   - 开发分支可以直接推送

2. **Require status checks to pass before merging** ✅
   - ✅ Require branches to be up to date before merging
   - 添加必需的检查：
     - `build` (来自 Deploy workflow)

3. **Do not allow bypassing the above settings** ❌
   - 允许管理员绕过（开发分支需要灵活性）

### 其他设置
- ❌ Allow force pushes（谨慎使用）
- ❌ Allow deletions（禁止删除分支）

---

## 工作流程建议

### 日常开发
```bash
# 1. 在 dev-fancy 分支开发
git checkout dev-fancy
git pull origin dev-fancy

# 2. 开发新功能
# ... 编码 ...

# 3. 提交并推送
git add .
git commit -m "feat: 添加新功能"
git push origin dev-fancy

# 4. 自动部署到 GitHub Pages
# GitHub Actions 会自动触发部署
```

### 发布到生产
```bash
# 1. 确保 dev-fancy 分支稳定
# 2. 创建 PR: dev-fancy -> main
# 3. 在 GitHub 上审查 PR
# 4. 合并 PR 到 main
# 5. main 分支可以配置单独的生产部署流程
```

---

## 可选：创建功能分支工作流

如果团队协作，可以使用更细粒度的分支策略：

```
main (生产)
  ↑
dev-fancy (开发)
  ↑
feature/xxx (功能分支)
```

### 功能分支流程
```bash
# 1. 从 dev-fancy 创建功能分支
git checkout dev-fancy
git checkout -b feature/new-feature

# 2. 开发功能
# ... 编码 ...

# 3. 推送功能分支
git push origin feature/new-feature

# 4. 创建 PR: feature/new-feature -> dev-fancy
# 5. 审查并合并到 dev-fancy
# 6. 删除功能分支
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

---

## 快速设置（个人项目简化版）

如果是个人项目，可以使用简化的保护规则：

### main 分支
- ✅ Require status checks to pass before merging
  - 添加 `build` 检查
- ❌ Allow force pushes
- ❌ Allow deletions

### dev-fancy 分支
- ✅ Require status checks to pass before merging
  - 添加 `build` 检查
- ❌ Allow deletions

这样既保证了代码质量，又保持了开发的灵活性。

---

## 注意事项

1. **首次设置**：如果仓库中已有这些分支，设置保护规则不会影响现有代码
2. **状态检查**：确保 GitHub Actions workflow 已经运行过至少一次，才能在保护规则中选择状态检查
3. **个人项目**：如果是个人项目，不需要设置 PR 审批要求
4. **团队协作**：如果有多人协作，建议启用 PR 审批和代码审查
