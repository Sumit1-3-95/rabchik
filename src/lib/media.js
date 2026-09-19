import { supabase, mediaUrl } from './supabase'

export const MEDIA_SELECT =
  'id,event_id,kind,path,caption,is_story,created_at,uploader,profiles!uploader(name),media_likes(count),media_comments(count)'

export async function fetchMyLikes(userId) {
  const { data } = await supabase.from('media_likes').select('media_id').eq('user_id', userId)
  return new Set((data || []).map((r) => r.media_id))
}

/** Shape a DB row for the UI */
export function normMedia(m, myLikes = new Set()) {
  return {
    id: m.id,
    eventId: m.event_id,
    kind: m.kind,
    path: m.path,
    url: mediaUrl(m.path),
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
  await supabase.storage.from('media').remove([item.path])
  const { error } = await supabase.from('media').delete().eq('id', item.id)
  if (error) throw error
}