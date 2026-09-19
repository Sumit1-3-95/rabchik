import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useQuery, toast } from '../../lib/hooks'
import Icon from '../../components/Icon'

/** Admins can promote any guest to admin (or step someone back down to friend). */
export default function Admins() {
  const nav = useNavigate()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const q = useQuery(async () => {
    const { data, error } = await supabase.rpc('admin_list_guests')
    if (error) throw error
    return data
  })

  const list = useMemo(() => {
    const t = search.trim().toLowerCase()
    return (q.data || [])
      .filter((g) => !t || g.name.toLowerCase().includes(t) || g.phone.includes(t))
      .sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin') || a.name.localeCompare(b.name))
  }, [q.data, search])

  const setRole = async (g, role) => {
    if (role !== 'admin' && !confirm(`Remove admin access for ${g.name}?`)) return
    if (role === 'admin' && !confirm(`Make ${g.name} an admin? They will be able to edit everything.`)) return
    setBusyId(g.id)
    const { error } = await supabase.rpc('set_user_role', { target: g.id, new_role: role })
    setBusyId(null)
    if (error) return toast(error.message)
    toast(role === 'admin' ? `${g.name} is now an admin` : `${g.name} is now a friend`)
    q.refetch()
  }

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="title" style={{ fontSize: 26, flex: 1 }}>Admins</h1>
      </div>
      <div className="small muted">Admins can edit events, polls, photos and guests. Search for a guest to make them an admin.</div>
      <label htmlFor="a-search" style={{ position: 'absolute', left: -9999 }}>Search guests</label>
      <input id="a-search" className="input" type="search" placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />

      {q.loading && <div className="spinner" />}
      {q.error && <div className="err">Could not load guests: {q.error.message}</div>}
      <div className="col" style={{ gap: 8 }}>
        {list.map((g) => {
          const isAdmin = g.role === 'admin'
          const me = g.id === session.user.id
          return (
            <div key={g.id} className="card row" style={{ padding: '12px 16px', borderRadius: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{g.name}{me ? ' (you)' : ''}</div>
                <div className="small muted">{g.phone}</div>
              </div>
              {isAdmin && <span className="tag admin">Admin</span>}
              {!me && (
                <button className={`chip ${isAdmin ? '' : 'on'}`} disabled={busyId === g.id} onClick={() => setRole(g, isAdmin ? 'friend' : 'admin')}>
                  {isAdmin ? 'Remove' : 'Make admin'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}