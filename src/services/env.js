function getBackend() {
  const b = import.meta?.env?.VITE_BACKEND || 'supabase'
  return (b || '').toLowerCase() === 'firebase' ? 'firebase' : 'supabase'
}

export { getBackend }

