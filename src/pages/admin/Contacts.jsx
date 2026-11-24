import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useQuery, toast } from '../../lib/hooks'
import Sheet from '../../components/Sheet'
import Icon from '../../components/Icon'
import '../../extras.css'

/** Link for the phone dialler. 10-digit Indian numbers get +91; numbers typed with + or 91 keep it. */
export function telHref(raw) {
  const s = (raw || '').trim()
  const digits = s.replace(/\D/g, '')
  if (s.startsWith('+')) return `tel:+${digits}`
  if (digits.length === 10) return `tel:+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `tel:+${digits}`
  return `tel:${digits}`
}

const EMPTY = { name: '', role: '', phone: '', notes: '' }

/** Admins: who to call if needed. Tap Call to open the phone dialler with the number filled in. */
export default function Contacts() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null) // null | { id?: string, ...fields }
  const [busy, setBusy] = useState(false)

  const list = useQuery(async () => {
    const { data, error } = await supabase.from('contacts').select('*').order('name')
    if (error) throw error
    return data
  })

  const t = q.trim().toLowerCase()
  const rows = useMemo(
    () => (list.data || []).filter((c) => !t || [c.name, c.role, c.notes, c.phone].some((v) => (v || '').toLowerCase().includes(t))),
    [list.data, t],
  )
  const set = (k) => (e) => setEdit((c) => ({ ...c, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    const name = edit.name.trim()
    const phone = edit.phone.trim()
    if (!name) return toast('Enter a name')
    if (phone.replace(/\D/g, '').length < 5) return toast('Enter a valid phone number')
    const row = { name, role: edit.role.trim() || null, phone, notes: edit.notes.trim() || null }
    setBusy(true)
    const { error } = edit.id
      ? await supabase.from('contacts').update(row).eq('id', edit.id)
      : await supabase.from('contacts').insert(row)
    setBusy(false)
    if (error) return toast(error.message)
    toast(edit.id ? 'Contact updated' : 'Contact added')
    setEdit(null)
    list.refetch()
  }

  const remove = async () => {
    setBusy(true)
    const { error } = await supabase.from('contacts').delete().eq('id', edit.id)
    setBusy(false)
    if (error) return toast(error.message)
    toast('Contact deleted')
    setEdit(null)
    list.refetch()
  }

  const count = (list.data || []).length
  return (
    <main className="page tight">
      <div className="dc-top">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <div style={{ flex: 1 }}>
          <h1 className="title" style={{ fontSize: 26 }}>Important contacts</h1>
          <div className="small muted">{count} {count === 1 ? 'contact' : 'contacts'} · visible to admins only</div>
        </div>
      </div>

      <button className="btn" onClick={() => setEdit({ ...EMPTY })}><Icon name="plus" /> Add contact</button>

      {count > 4 && (
        <div className="field">
          <label className="label" htmlFor="cq">Search</label>
          <input id="cq" className="input" placeholder="Name, role or number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {list.loading && <div className="spinner" />}
      {list.error && <div className="err">Could not load contacts: {list.error.message}. Did you run docs-contacts.sql?</div>}
      {!list.loading && !list.error && rows.length === 0 && (
        <div className="dc-empty">{count ? 'No contacts match.' : 'No contacts yet. Add the first one.'}</div>
      )}

      <div className="dc-list">
        {rows.map((c) => (
          <div key={c.id} className="card ct-row">
            <div className="ct-head">
              <div className="ct-name">
                <b>{c.name}</b>
                {c.role && <span className="ct-role">{c.role}</span>}
              </div>
              <button className="ct-edit" onClick={() => setEdit({ id: c.id, name: c.name, role: c.role || '', phone: c.phone, notes: c.notes || '' })} aria-label={`Edit ${c.name}`}><Icon name="pencil" size={18} /></button>
            </div>
            {c.notes && <p className="ct-notes">{c.notes}</p>}
            <a className="ct-call" href={telHref(c.phone)} aria-label={`Call ${c.name}`}>
              <Icon name="phone" size={20} /> Call <span>{c.phone}</span>
            </a>
          </div>
        ))}
      </div>

      <Sheet open={!!edit} onClose={() => !busy && setEdit(null)} title={edit?.id ? 'Edit contact' : 'Add contact'}>
        {edit && (
          <form className="col" onSubmit={save}>
            <div className="field">
              <label className="label" htmlFor="cn">Name</label>
              <input id="cn" className="input" value={edit.name} maxLength={80} onChange={set('name')} placeholder="e.g. Ramesh Sharma" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cr">Who they are</label>
              <input id="cr" className="input" value={edit.role} maxLength={80} onChange={set('role')} placeholder="e.g. Decorator, Resort manager, Driver" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cp">Phone number</label>
              <input id="cp" className="input" type="tel" inputMode="tel" value={edit.phone} maxLength={20} onChange={set('phone')} placeholder="98765 43210" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cd">Details (when to call)</label>
              <textarea id="cd" className="input" rows={3} value={edit.notes} maxLength={500} onChange={set('notes')} placeholder="e.g. Handles stage and flowers. Call if setup is delayed." />
            </div>
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            {edit.id && <button type="button" className="btn danger" disabled={busy} onClick={remove}>Delete contact</button>}
          </form>
        )}
      </Sheet>
    </main>
  )
}
