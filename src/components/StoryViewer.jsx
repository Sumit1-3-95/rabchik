import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { deleteMedia } from '../lib/media'
import { timeAgo } from '../lib/format'
import Icon from './Icon'
import Sheet from './Sheet'

const IMAGE_MS = 5000

/**
 * Full-screen story viewer.
 * groups: [{ key, label, items: [{ id, kind, url, caption, name, createdAt, likeCount, commentCount, liked, uploader }] }]
 * - photos auto-advance after 5s, videos when they end
 * - tap right/left, or swipe left/right, to move; swipe down or ✕ to close
 */
export default function StoryViewer({ groups, startGroup = 0, startItem = 0, onClose, onSeen, onChanged }) {
  const { session, isAdmin } = useAuth()
  const uid = session.user.id
  const [g, setG] = useState(startGroup)
  const [i, setI] = useState(startItem)
  const [p, setP] = useState(0)
  const [muted, setMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [likes, setLikes] = useState({}) // id -> { liked, count }
  const [counts, setCounts] = useState({}) // id -> comment count
  const videoRef = useRef(null)
  const down = useRef(null)

  const group = groups[g]
  const item = group?.items[i]
  const paused = showComments

  const next = useCallback(() => {
    if (i < group.items.length - 1) { setI(i + 1); setP(0) }
    else if (g < groups.length - 1) { setG(g + 1); setI(0); setP(0) }
    else onClose()
  }, [g, i, group, groups.length, onClose])

  const prev = useCallback(() => {
    if (i > 0) { setI(i - 1); setP(0) }
    else if (g > 0) { setG(g - 1); setI(groups[g - 1].items.length - 1); setP(0) }
    else setP(0)
  }, [g, i, groups])

  useEffect(() => { if (item) onSeen?.(item.id) }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // photo timer
  useEffect(() => {
    if (!item || item.kind === 'video' || paused) return
    let raf
    const startAt = performance.now() - (p / 100) * IMAGE_MS
    const tick = (t) => {
      const pr = Math.min(100, ((t - startAt) / IMAGE_MS) * 100)
      setP(pr)
      if (pr >= 100) next()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [item?.id, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  // pause/resume video
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused) v.pause()
    else v.play().catch(() => {})
  }, [paused, item?.id])

  const onPointerDown = (e) => { down.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    if (!down.current) return
    const dx = e.clientX - down.current.x
    const dy = e.clientY - down.current.y
    down.current = null
    if (dy > 90 && Math.abs(dx) < 60) return onClose()
    if (dx < -50) return next()
    if (dx > 50) return prev()
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const r = e.currentTarget.getBoundingClientRect()
      if (e.clientX - r.left < r.width / 3) prev()
      else next()
    }
  }

  const likeState = likes[item?.id] ?? { liked: item?.liked, count: item?.likeCount || 0 }
  const toggleLike = async () => {
    const liked = !likeState.liked
    setLikes((l) => ({ ...l, [item.id]: { liked, count: likeState.count + (liked ? 1 : -1) } }))
    if (liked) await supabase.from('media_likes').insert({ media_id: item.id, user_id: uid })
    else await supabase.from('media_likes').delete().match({ media_id: item.id, user_id: uid })
  }

  const remove = async () => {
    if (!confirm('Delete this photo/video?')) return
    await deleteMedia(item)
    onChanged?.()
    onClose()
  }

  if (!item) return null
  const commentCount = counts[item.id] ?? item.commentCount

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`${group.label} story`}>
      <div className="bars">
        {group.items.map((it, k) => (
          <div className="bar" key={it.id}><i style={{ width: `${k < i ? 100 : k === i ? p : 0}%` }} /></div>
        ))}
      </div>
      <div className="who">
        <div className="avatar">{item.name[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{group.label} · {item.name}</div>
          <div className="small muted">{timeAgo(item.createdAt)}</div>
        </div>
        {(item.uploader === uid || isAdmin) && (
          <button className="round glass" onClick={remove} aria-label="Delete"><Icon name="trash" size={20} /></button>
        )}
        <button className="round glass" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </div>

      <div className="stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {item.kind === 'video' ? (
          <video
            key={item.id} ref={videoRef} src={item.url} autoPlay playsInline muted={muted}
            onTimeUpdate={(e) => e.currentTarget.duration && setP((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
            onEnded={next}
          />
        ) : (
          <img key={item.id} src={item.url} alt={item.caption || 'Wedding photo'} draggable={false} />
        )}
        {item.caption && <div className="caption">{item.caption}</div>}
        <div className="side" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <button className="round glass" onClick={toggleLike} aria-label="Like" style={{ color: likeState.liked ? '#ff375f' : undefined }}>
            <Icon name="heart" size={24} fill={likeState.liked ? '#ff375f' : 'none'} color={likeState.liked ? '#ff375f' : 'currentColor'} />
          </button>
          <b>{likeState.count}</b>
          <button className="round glass" onClick={() => setShowComments(true)} aria-label="Comments"><Icon name="chat" size={23} /></button>
          <b>{commentCount}</b>
          {item.kind === 'video' && (
            <button className="round glass" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
              <Icon name={muted ? 'mute' : 'volume'} size={22} />
            </button>
          )}
        </div>
      </div>
      <div style={{ height: 'calc(24px + env(safe-area-inset-bottom, 0px))' }} />

      <CommentsSheet
        open={showComments} item={item} onClose={() => setShowComments(false)}
        onAdded={() => setCounts((c) => ({ ...c, [item.id]: (c[item.id] ?? item.commentCount) + 1 }))}
      />
    </div>
  )
}

function CommentsSheet({ open, item, onClose, onAdded }) {
  const { session, isAdmin } = useAuth()
  const [list, setList] = useState([])
  const [text, setText] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('media_comments').select('id,body,user_id,created_at,profiles(name)')
      .eq('media_id', item.id).order('created_at', { ascending: true })
    setList(data || [])
  }, [item.id])
  useEffect(() => { if (open) load() }, [open, load])

  const send = async (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setText('')
    const { error } = await supabase.from('media_comments').insert({ media_id: item.id, user_id: session.user.id, body })
    if (!error) { onAdded(); load() }
  }
  const del = async (id) => {
    await supabase.from('media_comments').delete().eq('id', id)
    load()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Comments">
      <div className="comments">
        {list.length === 0 && <div className="empty">No comments yet. Say something nice.</div>}
        {list.map((c) => (
          <div className="comment row between" key={c.id}>
            <div><b>{c.profiles?.name || 'Guest'}</b> {c.body}</div>
            {(c.user_id === session.user.id || isAdmin) && (
              <button onClick={() => del(c.id)} aria-label="Delete comment" style={{ background: 'none', border: 0 }}><Icon name="close" size={16} /></button>
            )}
          </div>
        ))}
      </div>
      <form className="row" onSubmit={send}>
        <label htmlFor="cmt" style={{ position: 'absolute', left: -9999 }}>Add a comment</label>
        <input id="cmt" className="input" placeholder="Add a comment" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} />
        <button className="round" style={{ background: 'var(--grad-btn)', color: '#fff' }} aria-label="Send"><Icon name="send" size={20} /></button>
      </form>
    </Sheet>
  )
}
