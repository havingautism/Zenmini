-- 删除所有表和数据（用于完全重置）
-- ⚠️ 警告：此操作会删除所有数据，请确认已备份！

-- 删除 RLS 策略
DROP POLICY IF EXISTS chat_sessions_owner ON public.chat_sessions;
DROP POLICY IF EXISTS messages_session_owner ON public.messages;

-- 禁用 RLS
ALTER TABLE IF EXISTS public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

-- 删除表
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;

-- 清理相关索引和约束
DROP INDEX IF EXISTS idx_chat_sessions_client;
DROP INDEX IF EXISTS idx_messages_session;

-- 显示当前剩余的表（用于验证）
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;