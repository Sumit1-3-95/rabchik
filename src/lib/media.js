import { supabase, mediaUrl } from './supabase'

export const MEDIA_SELECT =
  'id,event_id,kind,path,caption,is_story,created_at,uploader,profiles!uploader(name),media_likes(count),media_comments(count)'

export async function fetchMyLikes(userId) {
  const { data } = await supabase.from('media_likes').select('media_id').eq('user_id', userId)
  return new Set((data || []).map((r) => r.media_id))
}

/** Small preview path: uploads made by this version store a 400px copy as "t_<name>.jpg" next to the original. */
export function thumbPath(path) {
  if (!path || path.startsWith('http')) return null
  const i = path.lastIndexOf('/')
  const base = path.slice(i + 1).replace(/\.[^.]+$/, '')
  return `${path.slice(0, i + 1)}t_${base}.jpg`
}

/** Shape a DB row for the UI */
export function normMedia(m, myLikes = new Set()) {
  return {
    id: m.id,
    eventId: m.event_id,
    kind: m.kind,
    path: m.path,
    url: mediaUrl(m.path),
    thumb: mediaUrl(thumbPath(m.path)),
    caption: m.caption,
    isStory: m.is_story,
    createdAt: m.created_at,
    uploader: m.uploader,
    name: m.profiles?.name || 'Guest',
    likeCount: m.media_likes?.[0]?.count || 0,
    commentCount: m.media_comments?.[0]?.count || 0,
    liked: myLikes.has(m.id),
  }
}

export async function deleteMedia(item) {
  await supabase.storage.from('media').remove([item.path, thumbPath(item.path)].filter(Boolean))
  const { error } = await supabase.from('media').delete().eq('id', item.id)
  if (error) throw error
}