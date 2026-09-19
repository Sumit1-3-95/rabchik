import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useQuery, toast } from '../../lib/hooks'
import { Field, ImageInput } from '../../components/Field'
import Icon from '../../components/Icon'

const TABLE = { poll: 'polls', trivia: 'trivia_cards', game: 'games' }

/** One screen to add/edit a poll, a trivia card or a game. */
export default function EngageEdit() {
  const { type: routeType, id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const [type, setType] = useState(routeType)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [poll, setPoll] = useState({ kind: 'single', question: '', options: ['', '', '', ''], max_choices: 2, is_open: true })
  const [trivia, setTrivia] = useState({ title: '', body: '', cover_url: null })
  const [game, setGame] = useState({ title: '', description: '', cover_url: null, status: 'soon' })

  const q = useQuery(async () => {
    if (isNew) return null
    const { data, error: e } = await supabase.from(TABLE[routeType]).select('*').eq('id', id).maybeSingle()
    if (e) throw e
    return data
  }, [id, routeType])

  useEffect(() => {
    const d = q.data
    if (!d) return
    if (routeType === 'poll') setPoll({ ...d, options: [...(d.options || []), '', '', '', ''].slice(0, Math.max(4, (d.options || []).length)) })
    if (routeType === 'trivia') setTrivia({ title: d.title, body: d.body || '', cover_url: d.cover_url })
    if (routeType === 'game') setGame({ title: d.title, description: d.description || '', cover_url: d.cover_url, status: d.status })
  }, [q.data, routeType])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      let row
      if (type === 'poll') {
        const options = poll.options.map((o) => o.trim()).filter(Boolean)
        if (!poll.question.trim()) throw new Error('Write the question')
        if (poll.kind !== 'rating' && options.length < 2) throw new Error('Add at least two options')
        row = { kind: poll.kind, question: poll.question.trim(), options: poll.kind === 'rating' ? [] : options, max_choices: poll.kind === 'multi' ? Number(poll.max_choices) || 2 : 1, is_open: poll.is_open }
      } else if (type === 'trivia') {
        if (!trivia.title.trim()) throw new Error('Give it a title')
        row = { title: trivia.title.trim(), body: trivia.body || null, cover_url: trivia.cover_url }
        if (isNew) row.created_by = (await supabase.auth.getUser()).data.user.id
      } else {
        if (!game.title.trim()) throw new Error('Give the game a name')
        row = { title: game.title.trim(), description: game.description || null, cover_url: game.cover_url, status: game.status }
      }
      const table = TABLE[type]
      const { error: err } = isNew || type !== routeType
        ? await supabase.from(table).insert(row)
        : await supabase.from(table).update(row).eq('id', id)
      if (err) throw err
      toast('Saved')
      nav('/engage', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this?')) return
    const { error: err } = await supabase.from(TABLE[routeType]).delete().eq('id', id)
    if (err) return setError(err.message)
    nav('/engage', { replace: true })
  }

  if (q.loading) return <div className="spinner" />
  const setOpt = (i, v) => setPoll((p) => ({ ...p, options: p.options.map((o, k) => (k === i ? v : o)) }))

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="title" style={{ fontSize: 26, flex: 1 }}>{isNew ? 'Add' : 'Edit'}</h1>
        <span className="tag admin">Admin</span>
      </div>

      {isNew && (
        <div className="seg" role="tablist">
          {[['poll', 'Poll'], ['trivia', 'Trivia'], ['game', 'Game']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={type === k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>
          ))}
        </div>
      )}

      <form className="col" style={{ gap: 16 }} onSubmit={save}>
        {type === 'poll' && (
          <>
            <div className="scroll-x">
              {[['single', 'Single choice'], ['multi', 'Multi select'], ['rating', 'Rating']].map(([k, l]) => (
                <button type="button" key={k} className={`chip ${poll.kind === k ? 'on' : ''}`} onClick={() => setPoll((p) => ({ ...p, kind: k }))}>{l}</button>
              ))}
            </div>
            <Field label="Question" htmlFor="p-q"><input id="p-q" className="input" value={poll.question} onChange={(e) => setPoll((p) => ({ ...p, question: e.target.value }))} /></Field>
            {poll.kind !== 'rating' && (
              <>
                {poll.options.map((o, i) => (
                  <Field key={i} label={`Option ${i + 1}`} htmlFor={`p-o${i}`}><input id={`p-o${i}`} className="input" value={o} onChange={(e) => setOpt(i, e.target.value)} /></Field>
                ))}
                <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setPoll((p) => ({ ...p, options: [...p.options, ''] }))}>+ Add option</button>
              </>
            )}
            {poll.kind === 'multi' && (
              <Field label="Max picks" htmlFor="p-max"><input id="p-max" type="number" min="2" className="input" value={poll.max_choices} onChange={(e) => setPoll((p) => ({ ...p, max_choices: e.target.value }))} /></Field>
            )}
            <label className="row">
              <input type="checkbox" checked={poll.is_open} onChange={(e) => setPoll((p) => ({ ...p, is_open: e.target.checked }))} style={{ width: 22, height: 22, accentColor: '#b08a2a' }} />
              Voting is open
            </label>
          </>
        )}

        {type === 'trivia' && (
          <>
            <Field label="Title" htmlFor="t-t"><input id="t-t" className="input" value={trivia.title} onChange={(e) => setTrivia((t) => ({ ...t, title: e.target.value }))} /></Field>
            <Field label="Story or trivia" htmlFor="t-b"><textarea id="t-b" rows={5} className="input" value={trivia.body} onChange={(e) => setTrivia((t) => ({ ...t, body: e.target.value }))} /></Field>
            <ImageInput label="Cover photo" value={trivia.cover_url} onChange={(v) => setTrivia((t) => ({ ...t, cover_url: v }))} />
          </>
        )}

        {type === 'game' && (
          <>
            <Field label="Game name" htmlFor="g-t"><input id="g-t" className="input" value={game.title} onChange={(e) => setGame((g) => ({ ...g, title: e.target.value }))} /></Field>
            <Field label="Short description" htmlFor="g-d"><textarea id="g-d" rows={2} className="input" value={game.description} onChange={(e) => setGame((g) => ({ ...g, description: e.target.value }))} /></Field>
            <ImageInput label="Cover image" value={game.cover_url} onChange={(v) => setGame((g) => ({ ...g, cover_url: v }))} />
            <div className="scroll-x">
              {[['soon', 'Coming soon'], ['live', 'Live now']].map(([k, l]) => (
                <button type="button" key={k} className={`chip ${game.status === k ? 'on' : ''}`} onClick={() => setGame((g) => ({ ...g, status: k }))}>{l}</button>
              ))}
            </div>
          </>
        )}

        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Publish' : 'Save'}</button>
        {!isNew && <button type="button" className="btn danger" onClick={remove}>Delete</button>}
      </form>
    </main>
  )
}
