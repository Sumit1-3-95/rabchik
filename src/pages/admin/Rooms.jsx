import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useQuery, toast } from '../../lib/hooks'
import { ROOMS } from '../../lib/rooms'
import Sheet from '../../components/Sheet'
import Icon from '../../components/Icon'

const FILTERS = [['all', 'All'], ['ground', 'Ground'], ['first', 'First'], ['empty', 'Empty']]

/** Super admins: every room on the plan with the guests staying in it. Tap a name to edit, tap + to add. */
export default function Rooms() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [edit, setEdit] = useState(null) // { room, guest|null }
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const guests = useQuery(async () => {
    const { data, error } = await supabase.from('room_guests').select('*').order('created_at')
    if (error) throw error
    return data
  })
  const byRoom = useMemo(() => {
    const m = {}
    for (const g of guests.data || []) (m[g.room] ||= []).push(g)
    return m
  }, [guests.data])

  const t = q.trim().toLowerCase()
  const rows = ROOMS.filter((r) => {
    const gs = byRoom[r.no] || []
    if (filter === 'ground' && r.floor !== 'ground') return false
    if (filter === 'first' && r.floor !== 'first') return false
    if (filter === 'empty' && gs.length) return false
    if (!t) return true
    return r.no.includes(t) || gs.some((g) => g.name.toLowerCase().includes(t))
  })
  const filled = ROOMS.filter((r) => (byRoom[r.no] || []).length).length

  const open = (room, guest = null) => { setEdit({ room, guest }); setText(guest ? guest.name : '') }
  const close = () => setEdit(null)

  const save = async (e) => {
    e.preventDefault()
    const names = (edit.guest ? [text] : text.split(',')).map((n) => n.trim()).filter(Boolean)
    if (!names.length) return toast('Enter a name')
    setBusy(true)
    const { error } = edit.guest
      ? await supabase.from('room_guests').update({ name: names[0] }).eq('id', edit.guest.id)
      : await supabase.from('room_guests').insert(names.map((name) => ({ room: edit.room, name })))
    setBusy(false)
    if (error) return toast(error.message)
    toast(edit.guest ? 'Updated' : names.length > 1 ? 'Guests added' : 'Guest added')
    close()
    guests.refetch()
  }

  const remove = async () => {
    setBusy(true)
    const { error } = await supabase.from('room_guests').delete().eq('id', edit.guest.id)
    setBusy(false)
    if (error) return toast(error.message)
    toast('Removed')
    close()
    guests.refetch()
  }

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <div style={{ flex: 1 }}>
          <h1 className="title" style={{ fontSize: 26 }}>Room list</h1>
          <div className="small muted">{filled} of {ROOMS.length} rooms have guests</div>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="rmq">Search</label>
        <div style={{ position: 'relative' }}>
          <input id="rmq" className="input" style={{ paddingLeft: 44 }} placeholder="Room number or guest name" value={q} onChange={(e) => setQ(e.target.value)} />
          <span style={{ position: 'absolute', left: 14, top: 0, bottom: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}><Icon name="search" size={20} /></span>
        </div>
      </div>

      <div className="scroll-x" role="group" aria-label="Filter rooms">
        {FILTERS.map(([k, label]) => <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{label}</button>)}
      </div>

      {guests.loading && <div className="spinner" />}
      {guests.error && <div className="err">Could not load the room list: {guests.error.message}. Did you run rsvp-rooms.sql?</div>}
      {!guests.loading && rows.length === 0 && <div className="small muted" style={{ textAlign: 'center', padding: 24 }}>No rooms match.</div>}

      <div className="col" style={{ gap: 8 }}>
        {rows.map((r) => {
          const gs = byRoom[r.no] || []
          return (
            <div key={r.no} className="card rm-row">
              <div className="rm-no"><b>{r.no}</b><small>{r.exec ? 'Exec' : r.floor === 'ground' ? 'Ground' : 'First'}</small></div>
              <div className="rm-chips">
                {gs.map((g) => <button key={g.id} className="rm-chip" onClick={() => open(r.no, g)} aria-label={`Edit ${g.name}`}>{g.name}</button>)}
                <button className="rm-add" onClick={() => open(r.no)} aria-label={`Add a guest to room ${r.no}`}>{gs.length ? <Icon name="plus" size={16} /> : <><Icon name="plus" size={16} /> Add guest</>}</button>
              </div>
            </div>
          )
        })}
      </div>

      <Sheet open={!!edit} onClose={close} title={edit ? `${edit.guest ? 'Edit guest' : 'Add guest'} · Room ${edit.room}` : ''}>
        <form className="col" onSubmit={save}>
          <div className="field">
            <label className="label" htmlFor="rg">{edit?.guest ? 'Name' : 'Name (add several with commas)'}</label>
            <input id="rg" className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Guest name" />
          </div>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          {edit?.guest && <button type="button" className="btn danger" disabled={busy} onClick={remove}>Remove from this room</button>}
        </form>
      </Sheet>
    </main>
  )
}