# 安全政策

## 支持的版本

当前支持安全更新的版本：

| 版本 | 支持状态 |
| --- | --- |
| dev-fancy | :white_check_mark: |
| main | :white_check_mark: |

## 报告漏洞

如果你发现了安全漏洞，请**不要**公开发布 Issue。

请通过以下方式私下报告：

1. 发送邮件至项目维护者（如果有公开邮箱）
2. 或在 GitHub 上使用 [Security Advisories](https://github.com/havingautism/gemini_chat/security/advisories/new)

请在报告中包含：
- 漏洞的详细描述
- 复现步骤
- 潜在影响
- 可能的修复建议（如果有）

## 安全最佳实践

使用本项目时，请注意：

### API 密钥安全
- ⚠️ **永远不要**将 API 密钥提交到 Git 仓库
- ⚠️ **永远不要**在公开场合分享你的 API 密钥
- ✅ 使用环境变量或应用内配置
- ✅ 定期轮换 API 密钥
- ✅ 为不同环境使用不同的密钥

### Supabase 安全
- ✅ 启用 Row Level Security (RLS)
- ✅ 使用 Anon Key，不要使用 Service Role Key
- ✅ 定期审查数据库访问日志
- ✅ 限制 API 请求速率

### 前端安全
- ✅ 不要在前端存储敏感信息
- ✅ 使用 HTTPS 部署
- ✅ 定期更新依赖包
- ✅ 审查第三方库的安全性

## 依赖安全

我们使用以下工具监控依赖安全：
- GitHub Dependabot
- npm audit

建议定期运行：
```bash
npm audit
npm audit fix
```

## 响应时间

- 我们会在 **48 小时内**确认收到安全报告
- 我们会在 **7 天内**提供初步评估
- 修复时间取决于漏洞严重程度

## 致谢

感谢所有负责任地披露安全问题的研究人员！
