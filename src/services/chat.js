// Supabase-only chat service
async function sbFetchSessions(supabase, appId, clientId) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('app_id', appId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

function subscribeSessionsSB(supabase, appId, clientId, onChange, onError) {
  let active = true
  sbFetchSessions(supabase, appId, clientId).then((items) => active && onChange(items)).catch(onError || (() => {}))
  const channel = supabase
    .channel('chat_sessions_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_sessions', filter: `app_id=eq.${appId}` },
      () => {
        sbFetchSessions(supabase, appId, clientId).then((items) => active && onChange(items)).catch(onError || (() => {}))
      }
    )
    .subscribe()
  return () => {
    active = false
    supabase.removeChannel(channel)
  }
}

async function sbFetchMessages(supabase, sessionId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

function subscribeMessagesSB(supabase, appId, clientId, sessionId, onChange, onError) {
  let active = true
  sbFetchMessages(supabase, sessionId).then((items) => active && onChange(items)).catch(onError || (() => {}))
  const channel = supabase
    .channel('messages_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
      () => {
        sbFetchMessages(supabase, sessionId).then((items) => active && onChange(items)).catch(onError || (() => {}))
      }
    )
    .subscribe()
  return () => {
    active = false
    supabase.removeChannel(channel)
  }
}

async function createSessionSB(supabase, appId, clientId, title) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert([{ app_id: appId, client_id: clientId, title }])
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function addUserMessageSB(supabase, appId, clientId, sessionId, content, createdAt) {
  const payload = {
    session_id: sessionId,
    role: 'user',
    content,
  }
  if (createdAt) {
    payload.created_at = createdAt
  }
  const { error } = await supabase.from('messages').insert([payload])
  if (error) throw error
}

async function addModelMessageSB(supabase, appId, clientId, sessionId, payload) {
  const { content, thinkingProcess, sources, suggestedReplies, generatedWithThinking, generatedWithSearch, createdAt } = payload

  // 尝试包含 suggested_replies 字段
  const messageData = {
    session_id: sessionId,
    role: 'model',
    content,
    thinking_process: thinkingProcess || null,
    sources: sources || [],
    generated_with_thinking: !!generatedWithThinking,
    generated_with_search: !!generatedWithSearch,
  }
  if (createdAt) {
    messageData.created_at = createdAt
  }

  // 只有在提供了 suggestedReplies 时才添加该字段
  if (suggestedReplies && suggestedReplies.length > 0) {
    messageData.suggested_replies = suggestedReplies
  }

  let error = null
  try {
    // 尝试插入包含 suggested_replies 的消息
    const result = await supabase.from('messages').insert([messageData])
    error = result.error
  } catch (e) {
    error = e
  }

  // 如果因为字段不存在而失败，逐个移除可能有问题的字段
  if (error && error.message) {
    console.warn('Database field error, attempting to save without problematic fields:', error.message)

    // 移除可能不存在的字段
    const fieldsToCheck = ['suggested_replies', 'thinking_process']
    for (const field of fieldsToCheck) {
      if (error.message.includes(field) && messageData[field] !== undefined) {
        console.warn(`${field} field not found in database, saving without it`)
        delete messageData[field]
        // 重试插入
        const result = await supabase.from('messages').insert([messageData])
        error = result.error
        if (!error) break // 成功则停止尝试
      }
    }
  }

  if (error) throw error
}

async function deleteMessagesSB(supabase, appId, clientId, sessionId, ids) {
  const { error } = await supabase.from('messages').delete().in('id', ids).eq('session_id', sessionId)
  if (error) throw error
}

async function deleteSessionSB(supabase, appId, clientId, sessionId) {
  // 先删除该会话下的所有消息，再删除会话本身
  const { error: msgError } = await supabase.from('messages').delete().eq('session_id', sessionId)
  if (msgError) throw msgError

  const { error: sessionError } = await supabase.from('chat_sessions').delete().eq('id', sessionId)
  if (sessionError) throw sessionError
}

// --- Unified exports ---
export {
  subscribeSessionsSB as subscribeSessions,
  subscribeMessagesSB as subscribeMessages,
  createSessionSB as createSession,
  addUserMessageSB as addUserMessage,
  addModelMessageSB as addModelMessage,
  deleteMessagesSB as deleteMessages,
  deleteSessionSB as deleteSession,
}
