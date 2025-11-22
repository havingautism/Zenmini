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
  grounding_metadata jsonb,
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
`
}

async function detectTables(client) {
  const { error: sErr } = await client.from('chat_sessions').select('id').limit(1)
  const { error: mErr } = await client.from('messages').select('id').limit(1)
  return { hasSessions: !sErr, hasMessages: !mErr }
}

async function initSchemaIfFirstUse(client, setNeedsInit, setSchemaSql) {
  // Always detect tables to ensure schema is valid
  const { hasSessions, hasMessages } = await detectTables(client)
  if (hasSessions && hasMessages) {
    return
  }
  // Cannot create tables from client safely; show SQL to user
  setNeedsInit(true)
  setSchemaSql(getSchemaSql())
}

export { initSchemaIfFirstUse, getSchemaSql, detectTables }

