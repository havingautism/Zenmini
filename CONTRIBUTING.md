# 贡献指南

感谢你对 Zenmini 项目的关注！

## 如何贡献

### 报告问题

如果你发现了 bug 或有功能建议：

1. 在 [Issues](https://github.com/havingautism/gemini_chat/issues) 中搜索是否已有相关问题
2. 如果没有，创建新的 Issue，并提供：
   - 清晰的标题
   - 详细的描述
   - 复现步骤（如果是 bug）
   - 预期行为和实际行为
   - 截图（如果适用）
   - 浏览器和操作系统信息

### 提交代码

1. **Fork 项目**
   ```bash
   # 在 GitHub 上 Fork 项目
   # 然后克隆你的 Fork
   git clone https://github.com/YOUR_USERNAME/gemini_chat.git
   cd gemini_chat
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

3. **开发**
   - 遵循现有的代码风格
   - 添加必要的注释
   - 确保代码可以正常运行

4. **提交**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   # 或
   git commit -m "fix: 修复某个问题"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 重构
   - `perf:` 性能优化
   - `test:` 测试相关
   - `chore:` 构建/工具相关

5. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   然后在 GitHub 上创建 Pull Request

## 开发规范

### 代码风格

- 使用 2 空格缩进
- 使用单引号
- 组件使用 PascalCase
- 函数使用 camelCase
- 常量使用 UPPER_SNAKE_CASE

### 组件规范

```jsx
// 推荐的组件结构
import React, { useState, useEffect } from 'react';

function ComponentName({ prop1, prop2 }) {
  // 1. State
  const [state, setState] = useState(initialValue);

  // 2. Effects
  useEffect(() => {
    // effect logic
  }, [dependencies]);

  // 3. Handlers
  const handleClick = () => {
    // handler logic
  };

  // 4. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default ComponentName;
```

### 提交前检查

- [ ] 代码可以正常运行
- [ ] 没有 console.log 等调试代码
- [ ] 代码符合项目风格
- [ ] 提交信息清晰明确

## 项目结构

```
gemini_chat/
├── src/
│   ├── components/      # React 组件
│   ├── services/        # API 和服务
│   ├── App.jsx          # 主应用组件
│   └── main.jsx         # 入口文件
├── public/              # 静态资源
├── .github/             # GitHub 配置
│   └── workflows/       # GitHub Actions
└── package.json         # 项目配置
```

## 许可证

贡献代码即表示你同意将你的贡献以 CC BY-NC-SA 4.0 许可证发布。

## 行为准则

- 尊重所有贡献者
- 接受建设性的批评
- 专注于对项目最有利的事情
- 对社区成员表现出同理心

## 需要帮助？

如果你在贡献过程中遇到问题，可以：
- 在 Issue 中提问
- 查看现有的 PR 作为参考
- 联系项目维护者

感谢你的贡献！🎉
