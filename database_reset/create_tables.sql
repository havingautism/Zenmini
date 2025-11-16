-- 完整的数据库表创建脚本
-- 版本: v1.1 (包含 suggested_replies 字段)

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

-- 索引
create index if not exists idx_chat_sessions_client on public.chat_sessions(client_id);
create index if not exists idx_messages_session on public.messages(session_id);

-- 启用 RLS
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;

-- RLS 策略
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

-- 验证表结构
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('chat_sessions', 'messages')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;