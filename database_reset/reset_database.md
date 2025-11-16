# 数据库重置指南

## 说明
当数据库 schema 发生变化时（比如添加新字段），需要重置数据库以确保所有更改正确应用。

## 重置步骤

### 方法1: 通过 Supabase Dashboard

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 执行以下 SQL 命令清空并重建表：

```sql
-- 删除现有表
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;

-- 删除 RLS 策略
DROP POLICY IF EXISTS chat_sessions_owner ON public.chat_sessions;
DROP POLICY IF EXISTS messages_session_owner ON public.messages;

-- 禁用 RLS（如果启用）
ALTER TABLE IF EXISTS public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
```

5. 执行完整的 schema 创建（见 `create_tables.sql`）

### 方法2: 使用脚本文件

1. 执行 `delete_all_data.sql` 删除现有数据
2. 执行 `create_tables.sql` 重新创建表结构

## Schema 版本历史

### v1.0 (初始版本)
- chat_sessions 表
- messages 表（不含 suggested_replies）

### v1.1 (当前版本) - 2025-11-16
- 添加 `suggested_replies jsonb` 字段到 messages 表
- 保存延伸问题到数据库

## 注意事项

1. **数据备份**: 重置会删除所有现有数据，请确保重要数据已备份
2. **客户端缓存**: 重置后需要清除本地 localStorage 中的 `sb_inited` 标志
3. **API 限制**: 如果使用免费版本的 Supabase，注意操作频率限制

## 故障排除

### 错误: "Could not find the 'suggested_replies' column"
**原因**: 数据库 schema 还没有包含新字段
**解决**: 执行数据库重置步骤

### 错误: "relation 'public.messages' does not exist"
**原因**: 表还没有创建
**解决**: 执行完整的表创建脚本

## 自动化脚本

如需自动化重置，可以：
1. 备份现有数据（如果需要）
2. 使用 `auto_reset.sql` 一次性完成所有操作
3. 重启应用