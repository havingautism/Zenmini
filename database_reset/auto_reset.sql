-- 一键重置数据库脚本
-- 版本: v1.1 (2025-11-16)
-- 说明: 执行此脚本会完全重置数据库到最新版本

-- 开始重置
DO $$
BEGIN
    RAISE NOTICE '开始数据库重置...';

    -- 1. 删除 RLS 策略
    RAISE NOTICE '删除 RLS 策略...';
    DROP POLICY IF EXISTS chat_sessions_owner ON public.chat_sessions;
    DROP POLICY IF EXISTS messages_session_owner ON public.messages;

    -- 2. 禁用 RLS
    RAISE NOTICE '禁用 RLS...';
    ALTER TABLE IF EXISTS public.chat_sessions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

    -- 3. 删除表
    RAISE NOTICE '删除现有表...';
    DROP TABLE IF EXISTS public.messages CASCADE;
    DROP TABLE IF EXISTS public.chat_sessions CASCADE;

    -- 4. 删除索引
    RAISE NOTICE '删除索引...';
    DROP INDEX IF EXISTS idx_chat_sessions_client;
    DROP INDEX IF EXISTS idx_messages_session;

    RAISE NOTICE '数据库清理完成！';
END $$;

-- 5. 重新创建表结构
RAISE NOTICE '创建新表结构...';

-- 创建 chat_sessions 表
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  client_id text not null,
  title text not null,
  created_at timestamp with time zone default now()
);

-- 创建 messages 表
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','model')),
  content text not null,
  thinking_process text,
  sources jsonb,
  suggested_replies jsonb,
  generated_with_thinking boolean default false,
  generated_with_search boolean default false,
  created_at timestamp with time zone default now()
);

-- 创建索引
create index if not exists idx_chat_sessions_client on public.chat_sessions(client_id);
create index if not exists idx_messages_session on public.messages(session_id);

-- 启用 RLS
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;

-- 创建 RLS 策略
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'chat_sessions' and policyname = 'chat_sessions_owner') then
    create policy chat_sessions_owner on public.chat_sessions
      using ( current_setting('request.headers', true)::jsonb ? 'client-id' and (current_setting('request.headers', true)::jsonb ->> 'client-id') = client_id )
      with check ( current_setting('request.headers', true)::jsonb ? 'client-id' and (current_setting('request.headers', true)::jsonb ->> 'client-id') = client_id );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'messages' and policyname = 'messages_session_owner') then
    create policy messages_session_owner on public.messages
      using (
        exists (
          select 1 from public.chat_sessions s
          where s.id = session_id and (current_setting('request.headers', true)::jsonb ->> 'client-id') = s.client_id
        )
      )
      with check (
        exists (
          select 1 from public.chat_sessions s
          where s.id = session_id and (current_setting('request.headers', true)::jsonb ->> 'client-id') = s.client_id
        )
      );
  end if;
end $$;

RAISE NOTICE '数据库重置完成！';
RAISE NOTICE '版本: v1.1 (包含 suggested_replies 字段)';
RAISE NOTICE '请清除浏览器 localStorage 中的 sb_inited 标志';

-- 验证表结构
SELECT 'table_schema', 'table_name', 'column_name', 'data_type' as info
FROM information_schema.columns
WHERE table_name IN ('chat_sessions', 'messages')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;