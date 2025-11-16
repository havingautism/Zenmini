function getSchemaSql() {
  return `-- Create chat_sessions table
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  client_id text not null,
  title text not null,
  created_at timestamp with time zone default now()
);

-- Create messages table
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

-- Indexes
create index if not exists idx_chat_sessions_client on public.chat_sessions(client_id);
create index if not exists idx_messages_session on public.messages(session_id);

-- Enable RLS
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;

-- Basic RLS policies (allows CRUD by client_id via anon key if you pass it as header 'client-id')
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
`
}

async function detectTables(client) {
  const { error: sErr } = await client.from('chat_sessions').select('id').limit(1)
  const { error: mErr } = await client.from('messages').select('id').limit(1)
  return { hasSessions: !sErr, hasMessages: !mErr }
}

async function initSchemaIfFirstUse(client, setNeedsInit, setSchemaSql) {
  let flag = null
  try { flag = localStorage.getItem('sb_inited') } catch {}
  if (flag === '1') return
  const { hasSessions, hasMessages } = await detectTables(client)
  if (hasSessions && hasMessages) {
    try { localStorage.setItem('sb_inited', '1') } catch {}
    return
  }
  // Cannot create tables from client safely; show SQL to user
  setNeedsInit(true)
  setSchemaSql(getSchemaSql())
}

export { initSchemaIfFirstUse, getSchemaSql }

