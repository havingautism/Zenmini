# GitHub Actions 自动部署配置说明

## 配置步骤

### 1. 启用 GitHub Pages
1. 进入仓库设置：`Settings` → `Pages`
2. 在 `Source` 下选择 `GitHub Actions`

### 2. 配置环境变量（可选）
如果你的应用需要在构建时使用环境变量：

1. 进入 `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`
3. 添加以下 secrets（如果需要）：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`（不推荐，应该让用户在前端输入）

### 3. 触发部署
部署会在以下情况自动触发：
- 推送代码到 `dev-fancy` 分支
- 手动触发：`Actions` → `Deploy to GitHub Pages` → `Run workflow`

### 4. 访问网站
部署成功后，你的网站将在以下地址可用：
```
https://havingautism.github.io/gemini_chat/
```

## 注意事项

1. **Base URL 配置**：如果你的应用部署在子路径（如 `/gemini_chat/`），需要在 `vite.config.js` 中配置 `base`：
   ```js
   export default defineConfig({
     base: '/gemini_chat/',
     // ...
   })
   ```

2. **环境变量**：
   - 敏感信息（如 API 密钥）不应该硬编码在代码中
   - 建议让用户在应用中输入自己的 API 密钥
   - 如果必须使用构建时环境变量，请使用 GitHub Secrets

3. **构建时间**：
   - 首次部署可能需要 2-5 分钟
   - 后续部署通常更快

## 查看部署状态
1. 进入仓库的 `Actions` 标签
2. 查看最新的 workflow 运行状态
3. 点击查看详细日志
