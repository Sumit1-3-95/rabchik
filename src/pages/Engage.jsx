import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, mediaUrl } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useQuery, toast } from '../lib/hooks'
import { uploadFile } from '../lib/upload'
import { gradient } from '../lib/format'
import Icon from '../components/Icon'
import Sheet from '../components/Sheet'

export default function Engage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('polls')
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
  const { session, canPost, isAdmin } = useAuth()
  const uid = session.user.id
  const q = useQuery(async () => {
    const [polls, results, mine] = await Promise.all([
      supabase.from('polls').select('*').order('sort').order('created_at'),
      supabase.rpc('get_poll_results'),
      supabase.from('poll_votes').select('*').eq('user_id', uid),
    ])
    if (polls.error) throw polls.error
    const res = new Map()
    for (const r of results.data || []) {
      const e = res.get(r.poll_id) || { opts: {}, voters: Number(r.voters), avg: r.avg_rating }
      e.opts[r.opt] = Number(r.votes)
      res.set(r.poll_id, e)
    }
    return { polls: polls.data, res, mine: new Map((mine.data || []).map((v) => [v.poll_id, v])) }
  }, [uid])

  if (q.loading) return <div className="spinner" />
  if (!q.data?.polls.length) return <div className="empty">No polls yet.</div>

  return q.data.polls.map((p) => (
    <PollCard key={p.id} poll={p} res={q.data.res.get(p.id)} mine={q.data.mine.get(p.id)}
      canVote={canPost && p.is_open} isAdmin={isAdmin} onVoted={q.refetch} uid={uid} />
  ))
}

function PollCard({ poll, res, mine, canVote, isAdmin, onVoted, uid }) {
  const [pending, setPending] = useState(mine?.choices || [])
  const voters = res?.voters || 0
  const options = poll.options || []

  const vote = async (patch) => {
    if (!canVote) return
    const { error } = await supabase.from('poll_votes').upsert({ poll_id: poll.id, user_id: uid, ...patch }, { onConflict: 'poll_id,user_id' })
    if (error) return toast('Could not save your vote')
    toast('Vote saved')
    onVoted()
  }

  const label = { single: 'Single choice', multi: `Pick up to ${poll.max_choices}`, rating: 'Rating' }[poll.kind]
  return (
    <section className="card pad col" style={{ padding: '20px 16px 16px', position: 'relative' }}>
      {isAdmin && <Link to={`/admin/engage/poll/${poll.id}`} className="round" style={{ position: 'absolute', right: 12, top: 12, width: 40, height: 40, background: '#f7f4ec' }} aria-label="Edit poll"><Icon name="pencil" size={16} /></Link>}
      <div className="eyebrow">{label}</div>
      <h2 className="h2" style={{ fontSize: 21, lineHeight: 1.2, paddingRight: isAdmin ? 44 : 0 }}>{poll.question}</h2>

      {poll.kind === 'rating' ? (
        <>
          <div className="stars" role="group" aria-label="Rate from 1 to 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} disabled={!canVote} onClick={() => vote({ rating: n, choices: [] })} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                <Icon name="star" size={32} stroke={1.5} color="#cfa947" fill={(mine?.rating || 0) >= n ? '#cfa947' : 'none'} />
              </button>
            ))}
          </div>
          <div className="small muted">{res?.avg ? `${res.avg} average · ` : ''}{voters} rating{voters === 1 ? '' : 's'}</div>
        </>
      ) : (
        <>
          {options.map((o, idx) => {
            const votes = res?.opts?.[idx] || 0
            const pct = voters ? Math.round((votes / voters) * 100) : 0
            const isMine = poll.kind === 'single' ? mine?.choices?.includes(idx) : pending.includes(idx)
            const onClick = () => {
              if (!canVote) return
              if (poll.kind === 'single') return vote({ choices: [idx] })
              setPending((cur) => cur.includes(idx) ? cur.filter((x) => x !== idx) : cur.length < poll.max_choices ? [...cur, idx] : cur)
            }
            return (
              <button key={idx} className={`opt ${isMine ? 'mine' : ''}`} onClick={onClick} aria-pressed={!!isMine} disabled={!canVote}>
                <div className="fill" style={{ width: `${pct}%` }} />
                <div className="in">
                  <span className="row" style={{ gap: 8 }}>{o}{isMine && <Icon name="check" size={16} color="var(--accent)" stroke={2.4} />}</span>
                  <span className="muted" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                </div>
              </button>
            )
          })}
          {poll.kind === 'multi' && canVote && (
            <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => vote({ choices: pending })} disabled={!pending.length}>
              {mine ? 'Update my picks' : 'Submit'}
            </button>
          )}
          <div className="small muted">{voters} vote{voters === 1 ? '' : 's'}{!canVote && !poll.is_open ? ' · closed' : ''}</div>
        </>
      )}
    </section>
  )
}

/* ------------------------------ trivia ------------------------------ */
function Trivia() {
  const { session, canPost, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const q = useQuery(async () => {
    const { data, error } = await supabase.from('trivia_cards').select('*, profiles(name)').order('created_at', { ascending: false })
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
