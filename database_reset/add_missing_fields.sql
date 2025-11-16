-- 添加可能缺失的字段到 messages 表
-- 用于修复思考过程和延伸问题保存失败的问题

DO $$
BEGIN
    -- 检查并添加 thinking_process 字段
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='messages'
          AND column_name='thinking_process'
          AND table_schema='public'
    ) THEN
        ALTER TABLE public.messages
        ADD COLUMN thinking_process text;
        RAISE NOTICE 'thinking_process 字段已成功添加到 messages 表';
    ELSE
        RAISE NOTICE 'thinking_process 字段已存在于 messages 表中';
    END IF;

    -- 检查并添加 suggested_replies 字段
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='messages'
          AND column_name='suggested_replies'
          AND table_schema='public'
    ) THEN
        ALTER TABLE public.messages
        ADD COLUMN suggested_replies jsonb;
        RAISE NOTICE 'suggested_replies 字段已成功添加到 messages 表';
    ELSE
        RAISE NOTICE 'suggested_replies 字段已存在于 messages 表中';
    END IF;

    -- 检查并添加 sources 字段
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='messages'
          AND column_name='sources'
          AND table_schema='public'
    ) THEN
        ALTER TABLE public.messages
        ADD COLUMN sources jsonb;
        RAISE NOTICE 'sources 字段已成功添加到 messages 表';
    ELSE
        RAISE NOTICE 'sources 字段已存在于 messages 表中';
    END IF;

    -- 检查并添加 generated_with_thinking 字段
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='messages'
          AND column_name='generated_with_thinking'
          AND table_schema='public'
    ) THEN
        ALTER TABLE public.messages
        ADD COLUMN generated_with_thinking boolean default false;
        RAISE NOTICE 'generated_with_thinking 字段已成功添加到 messages 表';
    ELSE
        RAISE NOTICE 'generated_with_thinking 字段已存在于 messages 表中';
    END IF;

    -- 检查并添加 generated_with_search 字段
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='messages'
          AND column_name='generated_with_search'
          AND table_schema='public'
    ) THEN
        ALTER TABLE public.messages
        ADD COLUMN generated_with_search boolean default false;
        RAISE NOTICE 'generated_with_search 字段已成功添加到 messages 表';
    ELSE
        RAISE NOTICE 'generated_with_search 字段已存在于 messages 表中';
    END IF;
END $$;

-- 验证所有字段都存在
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name='messages'
  AND table_schema='public'
  AND column_name IN ('thinking_process', 'suggested_replies', 'sources', 'generated_with_thinking', 'generated_with_search')
ORDER BY column_name;