import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useQuery, toast } from '../../lib/hooks'
import Icon from '../../components/Icon'

const when = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

/** Super admins: everyone who tore the stub on the Invite page, with how many are coming. */
export default function Rsvps() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const rsvps = useQuery(async () => {
    const { data, error } = await supabase.from('rsvps').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  })
  const list = rsvps.data || []
  const people = list.reduce((n, r) => n + 1 + r.guests, 0)
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? list.filter((r) => r.name.toLowerCase().includes(t)) : list
  }, [list, q])

  const remove = async (r) => {
    if (!confirm(`Remove ${r.name}'s RSVP?`)) return
    const { error } = await supabase.from('rsvps').delete().eq('id', r.id)
    if (error) return toast(error.message)
    toast('RSVP removed')
    rsvps.refetch()
  }

  const copy = async () => {
    const text = list.map((r) => `${r.name}${r.guests ? ` (+${r.guests})` : ''}`).join('\n')
    try { await navigator.clipboard.writeText(text); toast('List copied') } catch { toast('Could not copy') }
  }

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="title" style={{ fontSize: 26, flex: 1 }}>RSVPs</h1>
        {list.length > 0 && <button className="chip" onClick={copy}>Copy list</button>}
      </div>

      <div className="card row" style={{ padding: '14px 18px', borderRadius: 22, justifyContent: 'space-around', textAlign: 'center' }}>
        <div><div className="title" style={{ fontSize: 30 }}>{list.length}</div><div className="small muted">responses</div></div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
        <div><div className="title" style={{ fontSize: 30 }}>{people}</div><div className="small muted">people coming</div></div>
      </div>

      <div className="field">
        <label className="label" htmlFor="rq">Search</label>
        <input id="rq" className="input" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {rsvps.loading && <div className="spinner" />}
      {rsvps.error && <div className="err">Could not load RSVPs: {rsvps.error.message}. Did you run rsvp-rooms.sql?</div>}
      {!rsvps.loading && !rsvps.error && list.length === 0 && <div className="small muted" style={{ textAlign: 'center', padding: 24 }}>No RSVPs yet. They will appear here as guests tear their stub on the Invite page.</div>}

      <div className="col" style={{ gap: 8 }}>
        {shown.map((r) => (
          <div key={r.id} className="card row between" style={{ padding: '12px 16px', borderRadius: 20 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{r.name}</div>
              <div className="small muted">{when(r.created_at)}</div>
            </div>
            <div className="row" style={{ gap: 8, flexShrink: 0 }}>
              <span className="tag relative">{r.guests ? `+${r.guests}` : 'Just them'}</span>
              <button className="round" style={{ width: 36, height: 36 }} onClick={() => remove(r)} aria-label={`Remove ${r.name}`}><Icon name="trash" size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}