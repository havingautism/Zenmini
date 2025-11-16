import { createClient } from '@supabase/supabase-js'

const EMPTY_SB_CONFIG = {
  url: '',
  anonKey: '',
}

function loadSupabaseConfigFromLocalStorage() {
  try {
    const str = localStorage.getItem('supabaseConfig')
    if (!str) return null
    return JSON.parse(str)
  } catch {
    return null
  }
}

function loadSupabaseConfigFromEnv() {
  const url = import.meta?.env?.VITE_SUPABASE_URL || ''
  const anonKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !anonKey) return null
  return { url, anonKey }
}

function getOrCreateClientId() {
  let clientId = null
  try { clientId = localStorage.getItem('clientId') } catch {}
  if (!clientId) {
    clientId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    try { localStorage.setItem('clientId', clientId) } catch {}
  }
  return clientId
}

function initSupabase(config, clientId) {
  const headers = {}
  if (clientId) headers['client-id'] = clientId
  const client = createClient(config.url, config.anonKey, { global: { headers } })
  return { client }
}

export { EMPTY_SB_CONFIG, loadSupabaseConfigFromLocalStorage, loadSupabaseConfigFromEnv, initSupabase, getOrCreateClientId }
