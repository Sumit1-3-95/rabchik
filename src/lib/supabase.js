import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — see .env.example')
}

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Public URL for a file in the "media" bucket (or pass through full URLs). */
export function mediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
