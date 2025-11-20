# GitHub Pages 环境保护规则配置

## 问题
```
Branch "dev-fancy" is not allowed to deploy to github-pages due to environment protection rules.
```

## 解决方案

### 方案一：移除环境保护（推荐用于个人项目）
已在 workflow 中移除 `environment` 配置，这样任何分支都可以部署。

### 方案二：配置允许的分支
如果你想保留环境保护，需要在 GitHub 中配置：

1. 访问：`https://github.com/havingautism/gemini_chat/settings/environments`
2. 点击 `github-pages` 环境
3. 在 **Deployment branches** 部分：
   - 选择 **Selected branches**
   - 点击 **Add deployment branch rule**
   - 添加 `dev-fancy` 分支

### 方案三：只允许 main 分支部署
如果你只想让 main 分支部署到生产环境：

1. 修改 `.github/workflows/deploy.yml`：
   ```yaml
   on:
     push:
       branches:
         - main  # 只在 main 分支触发
   ```

2. 在 GitHub Settings → Environments → github-pages：
   - Deployment branches: Selected branches
   - 添加 `main` 分支

## 当前配置
当前 workflow 已移除环境保护，允许 `dev-fancy` 分支直接部署。

## 推荐工作流程

### 开发环境（dev-fancy）
- 推送到 `dev-fancy` → 自动部署到 GitHub Pages
- 用于测试和预览

### 生产环境（可选）
如果需要区分开发和生产：
1. 创建单独的 workflow 用于 main 分支
2. 使用不同的部署目标或环境变量
3. 在 main 分支上启用环境保护

## 验证
推送代码后，检查 Actions 标签，部署应该成功。
