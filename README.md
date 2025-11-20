# Zenmini

<div align="center">

![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-blue)
![Version](https://img.shields.io/badge/version-0.1.0-green)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)

**简约·优雅·强大**

一个基于 Google Gemini API 的现代化 AI 对话应用

[在线体验](https://havingautism.github.io/gemini_chat/) | [报告问题](https://github.com/havingautism/gemini_chat/issues) | [贡献指南](CONTRIBUTING.md)

</div>

## ✨ 特性

- 🎨 **优雅设计** - 简洁现代的 UI，圆角气泡式设计语言
- 🚀 **流式响应** - 实时流式输出，体验更流畅
- 🧠 **深度思考** - 支持 Gemini 2.5 思考模式，展示推理过程
- 🌐 **网络搜索** - 集成 Google Search，获取最新信息
- 💾 **会话管理** - 基于 Supabase 的会话持久化存储
- 🎯 **模型切换** - 支持 Gemini 2.5 Flash 和 Pro 模型
- 🔊 **语音播放** - 内置 TTS 功能，自动播放回答
- 🌍 **多语言翻译** - 一键翻译消息内容
- 📱 **响应式设计** - 完美适配桌面和移动端

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Google Gemini API Key ([获取地址](https://aistudio.google.com/app/apikey))
- Supabase 账号（可选，用于会话存储）

### 安装

```bash
# 克隆项目
git clone https://github.com/havingautism/gemini_chat.git
cd gemini_chat

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 配置

#### 方式一：环境变量（推荐）

创建 `.env.local` 文件：

```env
# Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase 配置（可选）
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 方式二：应用内配置

在应用的设置界面中直接输入 API Key 和 Supabase 配置。

### Supabase 数据库初始化

如果使用 Supabase 存储会话，需要执行以下 SQL：

```sql
-- 创建会话表
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','model')),
  content TEXT NOT NULL,
  thinking_process TEXT,
  sources JSONB,
  suggested_replies JSONB,
  generated_with_thinking BOOLEAN DEFAULT FALSE,
  generated_with_search BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client ON public.chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON public.messages(session_id);

-- 启用 RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' AND policyname = 'chat_sessions_owner'
  ) THEN
    CREATE POLICY chat_sessions_owner ON public.chat_sessions
      USING (
        current_setting('request.headers', true)::jsonb ? 'client-id' 
        AND (current_setting('request.headers', true)::jsonb ->> 'client-id') = client_id
      )
      WITH CHECK (
        current_setting('request.headers', true)::jsonb ? 'client-id' 
        AND (current_setting('request.headers', true)::jsonb ->> 'client-id') = client_id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'messages_session_owner'
  ) THEN
    CREATE POLICY messages_session_owner ON public.messages
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions s
          WHERE s.id = session_id 
          AND (current_setting('request.headers', true)::jsonb ->> 'client-id') = s.client_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.chat_sessions s
          WHERE s.id = session_id 
          AND (current_setting('request.headers', true)::jsonb ->> 'client-id') = s.client_id
        )
      );
  END IF;
END $$;
```

## 🛠️ 技术栈

- **前端框架**: React 18
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **数据库**: Supabase (PostgreSQL)
- **AI 服务**: Google Gemini API
- **图标**: Lucide React

## 📦 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

构建产物将生成在 `dist` 目录。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 **CC BY-NC-SA 4.0**（知识共享-署名-非商业性使用-相同方式共享 4.0 国际）许可证。

- ✅ 允许：个人学习、研究、非商业使用
- ✅ 允许：修改和分发（需保持相同许可证）
- ❌ 禁止：商业使用
- ⚠️ 要求：署名原作者

详见 [LICENSE](LICENSE) 文件。

## ⚠️ 免责声明

本项目仅供学习和研究使用。使用本项目时，请遵守 Google Gemini API 的使用条款和限制。

## 🙏 致谢

- [Google Gemini](https://ai.google.dev/) - 提供强大的 AI 能力
- [Supabase](https://supabase.com/) - 提供后端服务
- [Lucide](https://lucide.dev/) - 提供精美图标

---

<div align="center">
Made with ❤️ by havingautism
