import { useCallback, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { useQuery } from './hooks'
import { MEDIA_SELECT, fetchMyLikes, normMedia } from './media'
import { gradient } from './format'

// "Seen" is remembered on this phone, so it works for visitors who are not signed in.
const KEY = 'rabchik.seen'
const loadSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
}
const saveSeen = (set) => {
  try { localStorage.setItem(KEY, JSON.stringify([...set].slice(-1500))) } catch { /* private mode: fine */ }
}

/**
 * Story circles: one circle per event (plus "Everyone" for uploads with no event).
 * Circles with unseen stories come first (green ring), then the most recently posted.
 */
export function useStories(events) {
  const { session } = useAuth()
  const uid = session?.user?.id
  const [seenSet, setSeenSet] = useState(loadSeen)

  const q = useQuery(async () => {
    const [m, likes] = await Promise.all([
      supabase.from('media').select(MEDIA_SELECT).eq('is_story', true).order('created_at', { ascending: false }).limit(200),
      fetchMyLikes(uid),
    ])
    if (m.error) throw m.error
    return { media: [...m.data].reverse(), likes } // newest 200 only, shown oldest to newest
  }, [uid])

  const groups = useMemo(() => {
    if (!q.data) return []
    const { media, likes } = q.data
    const isSeen = (id) => seenSet.has(id)
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
      const lastImage = [...items].reverse().find((i) => i.kind === 'image')
      return {
        key: k,
        label: ev?.title || 'Everyone',
        items,
        unseen: firstUnseen !== -1,
        firstUnseen: Math.max(0, firstUnseen),
        unseenCount: items.filter((it) => !isSeen(it.id)).length,
        latest: Math.max(...items.map((it) => +new Date(it.createdAt))),
        cover: lastImage?.url || null,
        coverThumb: lastImage?.thumb || null,
        gradient: gradient(ev?.theme_colors),
        order: ev ? ev.sort : 999,
      }
    })
    out.sort((a, b) => Number(b.unseen) - Number(a.unseen) || b.latest - a.latest || a.order - b.order)
    return out
  }, [q.data, events, seenSet])

  const markSeen = useCallback((id) => {
    setSeenSet((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      saveSeen(next)
      return next
    })
  }, [])

  return { groups, markSeen, refetch: q.refetch, loading: q.loading, error: q.error }
}