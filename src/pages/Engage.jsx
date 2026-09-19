import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase, mediaUrl } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useQuery, toast } from '../lib/hooks'
import { uploadFile } from '../lib/upload'
import { gradient } from '../lib/format'
import Icon from '../components/Icon'
import Sheet from '../components/Sheet'
import { PollCard, fetchPollData } from '../components/Poll'

export default function Engage() {
  const { isAdmin } = useAuth()
  const loc = useLocation()
  const [tab, setTab] = useState(loc.state?.tab || 'polls')
  return (
    <main className="page tight">
      <div className="row between">
        <h1 className="title">Play along</h1>
        {isAdmin && (
          <Link to={`/admin/engage/${tab === 'polls' ? 'poll' : tab === 'trivia' ? 'trivia' : 'game'}/new`} className="chip on" style={{ minHeight: 44 }}>
            <Icon name="plus" size={16} stroke={2.2} color="#fff" /> New
          </Link>
        )}
      </div>
      <div className="seg" role="tablist">
        {[['polls', 'Polls'], ['trivia', 'Trivia'], ['games', 'Games']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'polls' && <Polls />}
      {tab === 'trivia' && <Trivia />}
      {tab === 'games' && <Games />}
    </main>
  )
}

/* ------------------------------ polls ------------------------------ */
function Polls() {
  const { session, isAdmin } = useAuth()
  const uid = session.user.id
  const q = useQuery(() => fetchPollData(uid), [uid])

  if (q.loading) return <div className="spinner" />
  if (q.error) return <div className="err">Could not load polls: {q.error.message}</div>
  const { polls, res, mine } = q.data
  if (!polls.length) return <div className="empty">No polls yet.</div>

  const answered = polls.filter((p) => mine.has(p.id)).length
  // unanswered polls first, so there is always something new to tap
  const ordered = [...polls].sort((a, b) => Number(mine.has(a.id)) - Number(mine.has(b.id)))

  const toggle = async (p, key) => {
    const { error } = await supabase.from('polls').update({ [key]: !p[key] }).eq('id', p.id)
    if (error) return toast(error.message)
    toast(!p[key] ? (key === 'on_home' ? 'Results will show on Home' : 'Added to Stories') : 'Removed')
    q.refetch()
  }

  return (
    <>
      <div className="phero">
        <div className="row between">
          <div><b>{answered}</b> of {polls.length} answered</div>
          <span className="small muted">{answered === polls.length ? 'All done! 🎉' : 'Tap an answer'}</span>
        </div>
        <div className="ptrack"><i style={{ width: `${(answered / polls.length) * 100}%` }} /></div>
      </div>
      {ordered.map((p) => (
        <PollCard key={p.id} poll={p} index={polls.indexOf(p)} res={res.get(p.id)} mine={mine.get(p.id)}
          uid={uid} isAdmin={isAdmin} onVoted={q.refetch} onToggle={toggle} />
      ))}
    </>
  )
}

/* ------------------------------ trivia ------------------------------ */
function Trivia() {
  const { session, canPost, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const q = useQuery(async () => {
    const { data, error } = await supabase.from('trivia_cards').select('*, profiles!created_by(name)').order('created_at', { ascending: false })
    if (error) throw error
    return data
  })
  const remove = async (id) => {
    if (!confirm('Delete this card?')) return
    await supabase.from('trivia_cards').delete().eq('id', id)
    q.refetch()
  }
  return (
    <>
      {q.loading && <div className="spinner" />}
      {!q.loading && !q.data?.length && <div className="empty">No stories yet.{canPost ? ' Be the first to write one.' : ''}</div>}
      {(q.data || []).map((t, i) => {
        const cover = mediaUrl(t.cover_url)
        const mineOrAdmin = t.created_by === session.user.id || isAdmin
        return (
          <article key={t.id} className="card" style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: 120, backgroundImage: cover ? `url(${cover})` : gradient(i % 2 ? ['#FBF3DD', '#EBD595'] : ['#F3E6C4', '#D9BC6A']), backgroundSize: 'cover', backgroundPosition: 'center' }} />
            {mineOrAdmin && (
              <div className="row" style={{ position: 'absolute', right: 12, top: 12, gap: 8 }}>
                {isAdmin && <Link to={`/admin/engage/trivia/${t.id}`} className="round glass" style={{ width: 40, height: 40 }} aria-label="Edit"><Icon name="pencil" size={16} /></Link>}
                <button className="round glass" style={{ width: 40, height: 40 }} onClick={() => remove(t.id)} aria-label="Delete"><Icon name="trash" size={16} /></button>
              </div>
            )}
            <div style={{ padding: '14px 18px 18px' }}>
              <h2 className="h2">{t.title}</h2>
              {t.body && <p className="muted" style={{ marginTop: 4, lineHeight: 1.5, fontSize: 14, whiteSpace: 'pre-wrap' }}>{t.body}</p>}
              <div className="small muted" style={{ marginTop: 8 }}>by {t.profiles?.name || 'Guest'}</div>
            </div>
          </article>
        )
      })}
      {canPost && <button className="btn" onClick={() => setOpen(true)}><Icon name="pencil" size={18} color="#fff" /> Write a story</button>}
      <WriteStory open={open} onClose={() => setOpen(false)} onDone={q.refetch} />
    </>
  )
}

function WriteStory({ open, onClose, onDone }) {
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const cover = file ? await uploadFile(file, session.user.id) : null
      const { error } = await supabase.from('trivia_cards').insert({ title: title.trim(), body: body.trim() || null, cover_url: cover, created_by: session.user.id })
      if (error) throw error
      setTitle(''); setBody(''); setFile(null)
      toast('Posted!')
      onDone(); onClose()
    } catch (err) {
      alert(err.message)
    } finally { setBusy(false) }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Write a story">
      <form className="col" onSubmit={save}>
        <div className="field"><label className="label" htmlFor="ts-t">Title</label><input id="ts-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How I met Saurabh & Anushika" maxLength={80} /></div>
        <div className="field"><label className="label" htmlFor="ts-b">Your story</label><textarea id="ts-b" className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div className="field"><label className="label" htmlFor="ts-f">Photo (optional)</label><input id="ts-f" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        <button className="btn" disabled={busy || !title.trim()}>{busy ? 'Posting…' : 'Post'}</button>
      </form>
    </Sheet>
  )
}

/* ------------------------------ games ------------------------------ */
function Games() {
  const { isAdmin } = useAuth()
  const q = useQuery(async () => {
    const { data, error } = await supabase.from('games').select('*').order('sort')
    if (error) throw error
    return data
  })
  if (q.loading) return <div className="spinner" />
  if (!q.data?.length) return <div className="empty">Games are coming soon.</div>
  return q.data.map((g, i) => {
    const cover = mediaUrl(g.cover_url)
    return (
      <article key={g.id} className="card col" style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', backgroundImage: cover ? `url(${cover})` : gradient(i % 2 ? ['#FFF1BF', '#E0B84A'] : ['#F6EBD0', '#CDAE62']), backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {isAdmin && <Link to={`/admin/engage/game/${g.id}`} className="round glass" style={{ position: 'absolute', right: 12, top: 12, width: 40, height: 40 }} aria-label="Edit game"><Icon name="pencil" size={16} /></Link>}
        <h2 className="h2">{g.title}</h2>
        <div className="small" style={{ opacity: 0.7 }}>{g.status === 'live' ? 'Live now' : g.description || 'Coming soon'}</div>
      </article>
    )
  })
}