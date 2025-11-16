-- 为 messages 表添加 suggested_replies 字段
-- 用于修复 "Could not find the 'suggested_replies' column" 错误

-- 检查字段是否已存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='messages'
          AND column_name='suggested_replies'
          AND table_schema='public'
    ) THEN
        -- 字段不存在，添加它
        ALTER TABLE public.messages
        ADD COLUMN suggested_replies jsonb;

        RAISE NOTICE 'suggested_replies 字段已成功添加到 messages 表';
    ELSE
        RAISE NOTICE 'suggested_replies 字段已存在于 messages 表中';
    END IF;
END $$;

-- 验证字段是否添加成功
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name='messages'
  AND column_name='suggested_replies'
  AND table_schema='public';