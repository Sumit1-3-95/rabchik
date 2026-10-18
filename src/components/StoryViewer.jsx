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
  const { session, isSuper, canUpload } = useAuth()
  const uid = session?.user?.id
  const [g, setG] = useState(startGroup)
  const [i, setI] = useState(startItem)
  const [p, setP] = useState(0)
  const [muted, setMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [likes, setLikes] = useState({}) // id -> { liked, count }
  const [counts, setCounts] = useState({}) // id -> comment count
  const [holdPause, setHoldPause] = useState(false) // finger held down = pause
  const [readyId, setReadyId] = useState(null) // photo finished loading
  const [brokenId, setBrokenId] = useState(null)
  const videoRef = useRef(null)
  const down = useRef(null)
  const holdT = useRef(null)
  const holding = useRef(false)

  const group = groups[g]
  const item = group?.items[i]
  const paused = showComments || holdPause

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
    if (item.kind === 'image' && readyId !== item.id) return // wait for the photo so the bar never runs on a blank screen
    const dur = IMAGE_MS
    let raf
    const startAt = performance.now() - (p / 100) * dur
    const tick = (t) => {
      const pr = Math.min(100, ((t - startAt) / dur) * 100)
      setP(pr)
      if (pr >= 100) next()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [item?.id, paused, readyId]) // eslint-disable-line react-hooks/exhaustive-deps

  // never get stuck on a slow photo: start the bar after 4s regardless
  useEffect(() => {
    if (!item || item.kind !== 'image') return
    const t = setTimeout(() => setReadyId(item.id), 4000)
    return () => clearTimeout(t)
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // warm the next two photos so tapping forward is instant
  useEffect(() => {
    if (!group) return
    const flat = []
    for (let a = g; a < Math.min(groups.length, g + 2); a++) for (const it of groups[a].items) flat.push(it)
    const at = flat.findIndex((it) => it.id === item?.id)
    flat.slice(at + 1, at + 3).forEach((it) => { if (it.kind === 'image' && it.url) new Image().src = it.url })
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard (desktop): arrows to move, space to pause, esc to close
  useEffect(() => {
    const k = (e) => {
      if (showComments) return
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
      else if (e.key === ' ') { e.preventDefault(); setHoldPause((h) => !h) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  // pause/resume video
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused) v.pause()
    else v.play().catch(() => {})
  }, [paused, item?.id])

  const onPointerDown = (e) => {
    down.current = { x: e.clientX, y: e.clientY }
    holding.current = false
    clearTimeout(holdT.current)
    // press and hold = pause (like Instagram); letting go resumes without changing slide
    holdT.current = setTimeout(() => { holding.current = true; setHoldPause(true) }, 220)
  }
  const onPointerUp = (e) => {
    clearTimeout(holdT.current)
    if (!down.current) return
    const dx = e.clientX - down.current.x
    const dy = e.clientY - down.current.y
    down.current = null
    const wasHolding = holding.current
    if (wasHolding) { holding.current = false; setHoldPause(false) }
    if (dy > 90 && Math.abs(dx) < 60) return onClose()
    if (dx < -50) return next()
    if (dx > 50) return prev()
    if (wasHolding) return
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const r = e.currentTarget.getBoundingClientRect()
      if (e.clientX - r.left < r.width / 3) prev()
      else next()
    }
  }
  const onPointerCancel = () => { clearTimeout(holdT.current); down.current = null; if (holding.current) { holding.current = false; setHoldPause(false) } }
  useEffect(() => () => clearTimeout(holdT.current), [])

  const likeState = likes[item?.id] ?? { liked: item?.liked, count: item?.likeCount || 0 }
  const toggleLike = async () => {
    if (!canUpload) return
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
          <div className={`bar ${k < i ? 'done' : ''}`} key={it.id}><i style={{ width: `${k < i ? 100 : k === i ? p : 0}%` }} /></div>
        ))}
      </div>
      <div className="who">
        <div className="avatar">{item.name[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{group.label} · {item.name}</div>
          <div className="small muted">{timeAgo(item.createdAt)}</div>
        </div>
        {uid && (item.uploader === uid || isSuper) && (
          <button className="round glass" onClick={remove} aria-label="Delete"><Icon name="trash" size={20} /></button>
        )}
        <button className="round glass" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </div>

      <div className="stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onContextMenu={(e) => e.preventDefault()}>
        {item.kind === 'video' ? (
          <video
            key={item.id} ref={videoRef} src={item.url} poster={item.thumb || undefined} autoPlay playsInline muted={muted}
            onTimeUpdate={(e) => e.currentTarget.duration && setP((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
            onEnded={next}
          />
        ) : (
          <>
            <div key={`bg-${item.id}`} className="bgblur" style={{ backgroundImage: `url(${item.url})` }} aria-hidden="true" />
            <div className="bgtint" aria-hidden="true" />
            <img
              key={item.id} src={item.url} alt={item.caption || 'Wedding photo'} draggable={false}
              onLoad={() => setReadyId(item.id)} onError={() => { setBrokenId(item.id); setReadyId(item.id) }}
            />
            {readyId !== item.id && <div className="loading"><div className="spinner" /></div>}
            {brokenId === item.id && <div className="broken">This photo could not load.<br />Tap to continue.</div>}
          </>
        )}
        {holdPause && !showComments && <div className="paused-hint">Paused</div>}
        {item.caption && <div className="caption">{item.caption}</div>}
        {<div className="side" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          {canUpload ? (
            <button className="round glass" onClick={toggleLike} aria-label="Like" style={{ color: likeState.liked ? '#ff375f' : undefined }}>
              <Icon name="heart" size={24} fill={likeState.liked ? '#ff375f' : 'none'} color={likeState.liked ? '#ff375f' : 'currentColor'} />
            </button>
          ) : (
            <div className="round glass" aria-label="Likes" role="img"><Icon name="heart" size={24} color="#ff375f" fill="#ff375f" /></div>
          )}
          <b>{likeState.count}</b>
          <button className="round glass" onClick={() => setShowComments(true)} aria-label="Comments"><Icon name="chat" size={23} /></button>
          <b>{commentCount}</b>
          {item.kind === 'video' && (
            <button className="round glass" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
              <Icon name={muted ? 'mute' : 'volume'} size={22} />
            </button>
          )}
        </div>}
      </div>
      <div style={{ height: 'calc(24px + env(safe-area-inset-bottom, 0px))' }} />

      {<CommentsSheet
        open={showComments} item={item} canWrite={canUpload} onClose={() => setShowComments(false)}
        onAdded={() => setCounts((c) => ({ ...c, [item.id]: (c[item.id] ?? item.commentCount) + 1 }))}
      />}
    </div>
  )
}

function CommentsSheet({ open, item, canWrite, onClose, onAdded }) {
  const { session, isSuper } = useAuth()
  const [list, setList] = useState([])
  const [text, setText] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('media_comments').select('id,body,user_id,created_at,profiles!user_id(name)')
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
        {list.length === 0 && <div className="empty">No comments yet.</div>}
        {list.map((c) => (
          <div className="comment row between" key={c.id}>
            <div><b>{c.profiles?.name || 'Guest'}</b> {c.body}</div>
            {session && (c.user_id === session.user.id || isSuper) && (
              <button onClick={() => del(c.id)} aria-label="Delete comment" style={{ background: 'none', border: 0 }}><Icon name="close" size={16} /></button>
            )}
          </div>
        ))}
      </div>
      {canWrite ? <form className="row" onSubmit={send}>
        <label htmlFor="cmt" style={{ position: 'absolute', left: -9999 }}>Add a comment</label>
        <input id="cmt" className="input" placeholder="Add a comment" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} />
        <button className="round" style={{ background: 'var(--grad-btn)', color: '#fff' }} aria-label="Send"><Icon name="send" size={20} /></button>
      </form> : <div className="small muted" style={{ textAlign: 'center' }}>Only the wedding team can comment.</div>}
    </Sheet>
  )
}