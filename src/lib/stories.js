import { useCallback, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { useQuery } from './hooks'
import { MEDIA_SELECT, fetchMyLikes, normMedia } from './media'
import { gradient } from './format'

/**
 * Story circles: one circle per event (plus "Everyone" for uploads with no event).
 * Circles with unseen stories come first, like Instagram.
 */
export function useStories(events) {
  const { session } = useAuth()
  const uid = session?.user?.id
  const [localSeen, setLocalSeen] = useState(() => new Set())

  const q = useQuery(async () => {
    const [m, s, likes] = await Promise.all([
      supabase.from('media').select(MEDIA_SELECT).eq('is_story', true).order('created_at', { ascending: true }),
      supabase.from('story_views').select('media_id').eq('user_id', uid),
      fetchMyLikes(uid),
    ])
    if (m.error) throw m.error
    return { media: m.data, seen: new Set((s.data || []).map((r) => r.media_id)), likes }
  }, [uid])

  const groups = useMemo(() => {
    if (!q.data) return []
    const { media, seen, likes } = q.data
    const isSeen = (id) => seen.has(id) || localSeen.has(id)
    const evMap = new Map((events || []).map((e) => [e.id, e]))
    const by = new Map()
    for (const m of media) {
      const k = m.event_id || 'none'
      if (!by.has(k)) by.set(k, [])
      by.get(k).push(normMedia(m, likes))
    }
    const out = [...by.entries()].map(([k, items]) => {
      const ev = evMap.get(k)
      const firstUnseen = items.findIndex((it) => !isSeen(it.id))
      return {
        key: k,
        label: ev?.title || 'Everyone',
        items,
        unseen: firstUnseen !== -1,
        firstUnseen: Math.max(0, firstUnseen),
        cover: [...items].reverse().find((i) => i.kind === 'image')?.url || null,
        gradient: gradient(ev?.theme_colors),
        order: ev ? ev.sort : 999,
      }
    })
    out.sort((a, b) => Number(b.unseen) - Number(a.unseen) || a.order - b.order)
    return out
  }, [q.data, events, localSeen])

  const markSeen = useCallback((id) => {
    setLocalSeen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    supabase.from('story_views').upsert({ media_id: id, user_id: uid }).then(() => {})
  }, [uid])

  return { groups, markSeen, refetch: q.refetch, loading: q.loading }
}
