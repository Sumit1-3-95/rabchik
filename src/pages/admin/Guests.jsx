import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useQuery, toast } from '../../lib/hooks'
import Sheet from '../../components/Sheet'
import Icon from '../../components/Icon'

// Guests are created/edited by the "admin-guests" Edge Function (it needs the service role key).
async function call(body) {
  const { data, error } = await supabase.functions.invoke('admin-guests', { body })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

const BLANK = { name: '', phone: '', role: 'relative', room_no: '', side: '' }

export default function Guests() {
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState(null) // guest object, or BLANK for new
  const q = useQuery(async () => {
    const { data, error } = await supabase.rpc('admin_list_guests')
    if (error) throw error
    return data
  })
  const list = useMemo(() => {
    const t = search.trim().toLowerCase()
    return (q.data || []).filter((g) => !t || g.name.toLowerCase().includes(t) || g.phone.includes(t) || (g.room_no || '') === t)
  }, [q.data, search])

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="title" style={{ fontSize: 26, flex: 1 }}>Guests</h1>
        <button className="chip on" style={{ minHeight: 44 }} onClick={() => setEdit({ ...BLANK })}><Icon name="plus" size={16} stroke={2.2} color="#fff" /> Add</button>
      </div>
      <div className="small muted">{q.data?.length || 0} guests · new guests start with PIN 1234 and must change it on first login.</div>
      <label htmlFor="g-search" style={{ position: 'absolute', left: -9999 }}>Search guests</label>
      <input id="g-search" className="input" type="search" placeholder="Search name, phone or room" value={search} onChange={(e) => setSearch(e.target.value)} />

      {q.loading && <div className="spinner" />}
      {q.error && <div className="err">Could not load guests. Is the schema installed?</div>}
      <div className="col" style={{ gap: 8 }}>
        {list.map((g) => (
          <button key={g.id} className="card row" style={{ padding: '12px 16px', borderRadius: 20, border: 0, textAlign: 'left', width: '100%' }} onClick={() => setEdit(g)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{g.name}</div>
              <div className="small muted">{g.phone}{g.room_no ? ` · Room ${g.room_no}` : ''}{g.must_change_pin ? ' · PIN not set yet' : ''}</div>
            </div>
            <span className={`tag ${g.role}`} style={{ textTransform: 'capitalize' }}>{g.role}</span>
          </button>
        ))}
      </div>

      <GuestSheet guest={edit} onClose={() => setEdit(null)} onDone={q.refetch} />
    </main>
  )
}

function GuestSheet({ guest, onClose, onDone }) {
  const isNew = guest && !guest.id
  const [f, setF] = useState(BLANK)
  const [seen, setSeen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (guest && seen !== guest) { setSeen(guest); setF({ ...BLANK, ...guest, room_no: guest.room_no || '', side: guest.side || '' }); setError('') }
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const run = async (fn, okMsg) => {
    setBusy(true); setError('')
    try { await fn(); toast(okMsg); onDone(); onClose() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <Sheet open={!!guest} onClose={onClose} title={isNew ? 'Add guest' : 'Edit guest'}>
      <div className="field"><label className="label" htmlFor="gs-n">Name</label><input id="gs-n" className="input" value={f.name} onChange={set('name')} /></div>
      {isNew && <div className="field"><label className="label" htmlFor="gs-p">Phone number</label><input id="gs-p" className="input" type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} /></div>}
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label" htmlFor="gs-r">Role</label>
          <select id="gs-r" className="input" value={f.role} onChange={set('role')}>
            <option value="relative">Relative</option><option value="friend">Friend</option><option value="admin">Admin</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label" htmlFor="gs-room">Room</label>
          <input id="gs-room" className="input" inputMode="numeric" value={f.room_no} onChange={set('room_no')} />
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="gs-s">Side</label>
        <select id="gs-s" className="input" value={f.side} onChange={set('side')}>
          <option value="">—</option><option value="bride">Anushika's side</option><option value="groom">Saurabh's side</option>
        </select>
      </div>
      {error && <div className="err" role="alert">{error}</div>}
      <button className="btn" disabled={busy || !f.name.trim()} onClick={() =>
        run(() => isNew
          ? call({ action: 'create', name: f.name.trim(), phone: f.phone, role: f.role, room_no: f.room_no, side: f.side })
          : call({ action: 'update', id: guest.id, name: f.name.trim(), role: f.role, room_no: f.room_no, side: f.side }),
        'Saved')}>{busy ? 'Saving…' : 'Save'}</button>
      {!isNew && (
        <>
          <button className="btn secondary" disabled={busy} onClick={() => confirm(`Reset ${guest.name}'s PIN to 1234?`) && run(() => call({ action: 'reset_pin', id: guest.id }), 'PIN reset to 1234')}>Reset PIN to 1234</button>
          <button className="btn danger" disabled={busy} onClick={() => confirm(`Remove ${guest.name} from the app?`) && run(() => call({ action: 'delete', id: guest.id }), 'Guest removed')}>Remove guest</button>
        </>
      )}
    </Sheet>
  )
}
