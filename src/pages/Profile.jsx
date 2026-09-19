import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useQuery } from '../lib/hooks'
import Icon from '../components/Icon'

const roomNum = (r) => parseInt(r, 10) || 9999

export default function Profile() {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const q = useQuery(async () => {
    const { data, error } = await supabase.from('profiles').select('id,name,role,room_no,side').order('name')
    if (error) throw error
    return data
  })

  // group guests by room, split by side (Anushika's side = bride, Saurabh's = groom)
  const sides = useMemo(() => {
    const term = search.trim().toLowerCase()
    const guests = (q.data || []).filter((g) => !term || g.name.toLowerCase().includes(term) || (g.room_no || '').toLowerCase() === term.replace(/^room\s*/, ''))
    const build = (side) => {
      const rooms = new Map()
      guests.filter((g) => g.side === side).forEach((g) => {
        const k = g.room_no || '—'
        if (!rooms.has(k)) rooms.set(k, [])
        rooms.get(k).push(g)
      })
      return [...rooms.entries()].sort((a, b) => roomNum(a[0]) - roomNum(b[0]))
    }
    const other = new Map()
    guests.filter((g) => !g.side).forEach((g) => {
      const k = g.room_no || '—'
      if (!other.has(k)) other.set(k, [])
      other.get(k).push(g)
    })
    return [
      ["Anushika's side · Rooms 1–35", build('bride')],
      ["Saurabh's side · Rooms 36–55", build('groom')],
      ['Others', [...other.entries()]],
    ].filter(([, rooms]) => rooms.length)
  }, [q.data, search])

  return (
    <main className="page tight">
      <div className="row" style={{ gap: 16 }}>
        <div className="slot" style={{ width: 76, height: 76, borderStyle: 'solid', borderColor: 'transparent', background: 'var(--rose)', fontSize: 30, fontWeight: 700, color: 'var(--maroon)', boxShadow: 'var(--sh)' }}>
          {profile.name[0]}
        </div>
        <div className="col" style={{ gap: 8 }}>
          <h1 className="title" style={{ fontSize: 26, lineHeight: 1.1 }}>{profile.name}</h1>
          <div className="row" style={{ gap: 6 }}>
            {profile.room_no && <span className="chip">Room {profile.room_no}</span>}
            <span className="chip" style={{ textTransform: 'capitalize' }}>{profile.role}</span>
          </div>
        </div>
      </div>

      <h2 className="h2" style={{ marginTop: 6 }}>Community</h2>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 16, top: 14, color: 'var(--muted)' }}><Icon name="search" size={20} /></span>
        <label htmlFor="find" style={{ position: 'absolute', left: -9999 }}>Search guests or rooms</label>
        <input id="find" className="input" type="search" placeholder="Search name or room" value={search} onChange={(e) => setSearch(e.target.value)} style={{ borderRadius: 24, paddingLeft: 46 }} />
      </div>

      {q.loading && <div className="spinner" />}
      {sides.map(([title, rooms]) => (
        <section key={title} className="col">
          <div className="label">{title}</div>
          {rooms.map(([room, people]) => (
            <div key={room} className="card" style={{ padding: '14px 18px', borderRadius: 24 }}>
              <div className="eyebrow">Room {room}</div>
              {people.map((g) => (
                <div key={g.id} className="row" style={{ padding: '9px 0', gap: 12 }}>
                  <span className="slot" style={{ width: 38, height: 38, borderStyle: 'solid', borderColor: 'transparent', background: 'var(--rose)', fontWeight: 700, fontSize: 14, color: 'var(--maroon)' }}>{g.name[0]}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{g.name}</span>
                  <span className={`tag ${g.role}`} style={{ textTransform: 'capitalize' }}>{g.role}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
      {!q.loading && !sides.length && <div className="empty">No guests match your search.</div>}
    </main>
  )
}
