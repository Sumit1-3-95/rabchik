import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useQuery, toast } from '../../lib/hooks'
import { addTeamMember } from '../../lib/team'
import { normPhone } from '../../lib/phone'
import Icon from '../../components/Icon'

const ROLE = { admin: 'Super admin', friend: 'Admin' }

/** Super admins: see everyone on the team with their PIN, add people, reset PINs, remove access. */
export default function Team() {
  const nav = useNavigate()
  const { session } = useAuth()
  const [show, setShow] = useState({}) // id -> PIN visible
  const [f, setF] = useState({ name: '', phone: '', pin: '', role: 'friend' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const q = useQuery(async () => {
    const { data, error: e } = await supabase.rpc('team_list')
    if (e) throw e
    return data
  })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: k === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value }))

  const add = async (e) => {
    e.preventDefault()
    setError('')
    if (!f.name.trim()) return setError('Enter a name')
    if (normPhone(f.phone).length !== 10) return setError('Enter a 10-digit mobile number')
    if (!/^\d{4}$/.test(f.pin)) return setError('PIN must be 4 digits')
    setBusy(true)
    try {
      await addTeamMember({ phone: normPhone(f.phone), name: f.name.trim(), pin: f.pin, role: f.role })
      toast(`${f.name.trim()} added`)
      setF({ name: '', phone: '', pin: '', role: 'friend' })
      q.refetch()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const resetPin = async (m) => {
    const pin = prompt(`New 4-digit PIN for ${m.name}`)
    if (pin === null) return
    if (!/^\d{4}$/.test(pin)) return toast('PIN must be 4 digits')
    const { error: e } = await supabase.rpc('team_set_pin', { target: m.id, p_pin: pin })
    if (e) return toast(e.message)
    toast('PIN updated')
    q.refetch()
  }

  const remove = async (m) => {
    if (!confirm(`Remove ${m.name}'s access? They will no longer be able to log in as admin.`)) return
    const { error: e } = await supabase.rpc('team_remove', { target: m.id })
    if (e) return toast(e.message)
    toast('Access removed')
    q.refetch()
  }

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="title" style={{ fontSize: 26, flex: 1 }}>Team &amp; PINs</h1>
      </div>
      <div className="small muted">
        <b>Admins</b> can upload photos and videos. <b>Super admins</b> can also edit event cards and manage this list.
      </div>

      <form className="card col" style={{ padding: '18px 16px' }} onSubmit={add}>
        <h2 className="h2" style={{ fontSize: 19 }}>Add a team member</h2>
        <div className="field"><label className="label" htmlFor="t-name">Name</label><input id="t-name" className="input" value={f.name} onChange={set('name')} placeholder="Full name" /></div>
        <div className="field"><label className="label" htmlFor="t-phone">Phone number</label><input id="t-phone" className="input" type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} placeholder="10-digit mobile number" /></div>
        <div className="field"><label className="label" htmlFor="t-pin">PIN (4 digits, you choose)</label><input id="t-pin" className="input" inputMode="numeric" maxLength={4} value={f.pin} onChange={set('pin')} placeholder="4 digits" /></div>
        <div className="field">
          <label className="label" htmlFor="t-role">Access</label>
          <select id="t-role" className="input" value={f.role} onChange={set('role')}>
            <option value="friend">Admin (upload photos)</option>
            <option value="admin">Super admin (everything)</option>
          </select>
        </div>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Adding…' : 'Add to team'}</button>
        <div className="small muted">If this number already has an account, its PIN is replaced with the one you enter.</div>
      </form>

      {q.loading && <div className="spinner" />}
      {q.error && <div className="err">Could not load the team: {q.error.message}. Did you run public-site.sql?</div>}
      <div className="col" style={{ gap: 8 }}>
        {(q.data || []).map((m) => {
          const me = m.id === session.user.id
          return (
            <div key={m.id} className="card col" style={{ padding: '12px 16px', borderRadius: 20, gap: 8 }}>
              <div className="row between">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}{me ? ' (you)' : ''}</div>
                  <div className="small muted">{m.phone}</div>
                </div>
                <span className={`tag ${m.role === 'admin' ? 'admin' : ''}`}>{ROLE[m.role]}</span>
              </div>
              <div className="row between">
                <div className="small">
                  PIN: <b style={{ letterSpacing: '0.15em' }}>{m.pin ? (show[m.id] ? m.pin : '••••') : 'not saved'}</b>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {m.pin && <button className="chip" onClick={() => setShow((s) => ({ ...s, [m.id]: !s[m.id] }))}><Icon name="eye" size={14} />{show[m.id] ? 'Hide' : 'Show'}</button>}
                  <button className="chip" onClick={() => resetPin(m)}>{m.pin ? 'Change PIN' : 'Set PIN'}</button>
                  {!me && <button className="chip" onClick={() => remove(m)}>Remove</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}