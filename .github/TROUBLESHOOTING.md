# GitHub Pages 部署失败解决方案

## 错误原因
```
Error: Failed to create deployment (status: 404)
Ensure GitHub Pages has been enabled
```

这个错误表示 GitHub Pages 功能还没有在仓库中启用。

## 解决步骤

### 1. 启用 GitHub Pages
1. 访问：https://github.com/havingautism/gemini_chat/settings/pages
2. 在 **Source** 部分：
   - 选择 **GitHub Actions**（不是 Deploy from a branch）
3. 点击 **Save**

### 2. 重新运行 Workflow
启用 GitHub Pages 后：
1. 进入 Actions 标签：https://github.com/havingautism/gemini_chat/actions
2. 找到失败的 workflow run
3. 点击 **Re-run all jobs**

或者直接推送新的提交来触发部署。

### 3. 验证部署
部署成功后，你的应用将在以下地址可用：
```
https://havingautism.github.io/gemini_chat/
```

## 常见问题

### Q: 为什么要选择 "GitHub Actions" 而不是 "Deploy from a branch"？
A: 我们使用的是 GitHub Actions workflow 来构建和部署，所以必须选择 "GitHub Actions" 作为源。

### Q: 部署需要多长时间？
A: 通常 2-5 分钟。你可以在 Actions 标签中实时查看进度。

### Q: 如何查看部署日志？
A: 
1. 进入 Actions 标签
2. 点击最新的 "Deploy to GitHub Pages" workflow
3. 点击 "build" 或 "deploy" 查看详细日志

### Q: 部署后访问网站显示 404？
A: 
1. 确认 `vite.config.js` 中的 `base` 路径设置正确：`base: '/gemini_chat/'`
2. 等待几分钟让 GitHub Pages 完全部署
3. 清除浏览器缓存后重试

## 手动触发部署
如果需要手动触发部署（不推送代码）：
1. 进入 Actions 标签
2. 选择 "Deploy to GitHub Pages" workflow
3. 点击 "Run workflow"
4. 选择 `dev-fancy` 分支
5. 点击绿色的 "Run workflow" 按钮
