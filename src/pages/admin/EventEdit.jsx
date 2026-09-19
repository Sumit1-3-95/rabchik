import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, mediaUrl } from '../../lib/supabase'
import { useQuery, toast } from '../../lib/hooks'
import { uploadFile } from '../../lib/upload'
import { Field, ImageInput } from '../../components/Field'
import Icon from '../../components/Icon'

const EMPTY = {
  title: '', event_date: '2026-12-10', time_label: '', venue: 'Riddhi Resorts',
  maps_url: 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', dress_code: '', theme_label: '',
  theme_colors: ['#F4DE94', '#C9A227'], display_image_url: null, background_url: null,
  banner_urls: [], menu_items: [], expect: '', trivia: '', sort: 0, published: true,
}

export default function EventEdit() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const q = useQuery(async () => {
    if (isNew) return null
    const { data, error: e } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
    if (e) throw e
    return data
  }, [id])
  useEffect(() => { if (q.data) setF({ ...EMPTY, ...q.data, theme_colors: q.data.theme_colors?.length ? q.data.theme_colors : EMPTY.theme_colors }) }, [q.data])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const setVal = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  const addBanner = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    for (const file of files) {
      try {
        const path = await uploadFile(file, 'events')
        setF((s) => ({ ...s, banner_urls: [...s.banner_urls, path] }))
      } catch (err) { setError(err.message) }
    }
  }
  const menu = [0, 1, 2, 3].map((i) => f.menu_items[i] || { name: '', image_url: null })
  const setMenu = (i, patch) => setF((s) => {
    const m = [0, 1, 2, 3].map((k) => s.menu_items[k] || { name: '', image_url: null })
    m[i] = { ...m[i], ...patch }
    return { ...s, menu_items: m }
  })

  const save = async (e) => {
    e.preventDefault()
    setError('')
    if (!f.title.trim()) return setError('Give the event a name')
    setBusy(true)
    const row = {
      title: f.title.trim(), event_date: f.event_date, time_label: f.time_label || null, venue: f.venue || null,
      maps_url: f.maps_url || null, dress_code: f.dress_code || null, theme_label: f.theme_label || null,
      theme_colors: f.theme_colors, display_image_url: f.display_image_url, background_url: f.background_url,
      banner_urls: f.banner_urls, menu_items: f.menu_items.filter((m) => m.name?.trim()),
      expect: f.expect || null, trivia: f.trivia || null, sort: Number(f.sort) || 0, published: f.published,
    }
    const { data, error: err } = isNew
      ? await supabase.from('events').insert(row).select('id').single()
      : await supabase.from('events').update(row).eq('id', id).select('id').single()
    setBusy(false)
    if (err) return setError(err.message)
    toast('Saved')
    nav(`/events/${data.id}`, { replace: true })
  }

  const remove = async () => {
    if (!confirm(`Delete "${f.title}"? Photos uploaded to it stay in Moments.`)) return
    const { error: err } = await supabase.from('events').delete().eq('id', id)
    if (err) return setError(err.message)
    nav('/', { replace: true })
  }

  if (q.loading) return <div className="spinner" />

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="title" style={{ fontSize: 26, flex: 1 }}>{isNew ? 'New event' : 'Edit event'}</h1>
        <span className="tag admin">Admin</span>
      </div>

      <form className="col" style={{ gap: 16 }} onSubmit={save}>
        <div className="field">
          <div className="label">Banner photos (the iconic shots, shown as a slideshow)</div>
          <div className="grid4">
            {f.banner_urls.map((p, i) => (
              <button type="button" key={p} className="tile" aria-label="Remove banner photo" onClick={() => setF((s) => ({ ...s, banner_urls: s.banner_urls.filter((_, k) => k !== i) }))} style={{ backgroundImage: `url(${mediaUrl(p)})` }}>
                <span className="play glass" style={{ left: 6, right: 'auto', top: 6, bottom: 'auto' }}><Icon name="close" size={12} /></span>
              </button>
            ))}
            <label className="upload-tile" style={{ cursor: 'pointer' }}>
              <Icon name="plus" stroke={2} color="var(--accent)" />
              <input type="file" accept="image/*" multiple hidden onChange={addBanner} />
            </label>
          </div>
        </div>

        <ImageInput label="Card image" value={f.display_image_url} onChange={setVal('display_image_url')} />
        <ImageInput label="Background image (event page)" value={f.background_url} onChange={setVal('background_url')} />

        <Field label="Event name" htmlFor="e-title"><input id="e-title" className="input" value={f.title} onChange={set('title')} /></Field>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}><Field label="Date (shows as a day chip)" htmlFor="e-date"><input id="e-date" type="date" className="input" value={f.event_date} onChange={set('event_date')} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Start time" htmlFor="e-time"><input id="e-time" className="input" placeholder="Morning / 10:00 AM" value={f.time_label || ''} onChange={set('time_label')} /></Field></div>
        </div>
        <Field label="Location" htmlFor="e-venue"><input id="e-venue" className="input" value={f.venue || ''} onChange={set('venue')} /></Field>
        <Field label="Google Maps link" htmlFor="e-maps"><input id="e-maps" className="input" inputMode="url" value={f.maps_url || ''} onChange={set('maps_url')} /></Field>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}><Field label="Dress code" htmlFor="e-dress"><input id="e-dress" className="input" value={f.dress_code || ''} onChange={set('dress_code')} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Theme name" htmlFor="e-theme"><input id="e-theme" className="input" placeholder="Yellow" value={f.theme_label || ''} onChange={set('theme_label')} /></Field></div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label className="label" htmlFor="e-c1">Theme colour 1</label>
            <input id="e-c1" type="color" value={f.theme_colors[0]} onChange={(e) => setF((s) => ({ ...s, theme_colors: [e.target.value, s.theme_colors[1]] }))} style={{ width: '100%', height: 44, border: 0, background: 'none' }} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="label" htmlFor="e-c2">Theme colour 2</label>
            <input id="e-c2" type="color" value={f.theme_colors[1]} onChange={(e) => setF((s) => ({ ...s, theme_colors: [s.theme_colors[0], e.target.value] }))} style={{ width: '100%', height: 44, border: 0, background: 'none' }} />
          </div>
        </div>

        <div className="field">
          <div className="label">Menu (4 images)</div>
          <div className="col" style={{ gap: 10 }}>
            {menu.map((m, i) => (
              <div key={i} className="row">
                <ImageInput value={m.image_url} onChange={(v) => setMenu(i, { image_url: v })} size={64} />
                <input className="input" aria-label={`Menu item ${i + 1} name`} placeholder={`Dish ${i + 1}`} value={m.name} onChange={(e) => setMenu(i, { name: e.target.value })} />
              </div>
            ))}
          </div>
        </div>

        <Field label="What to expect" htmlFor="e-exp"><textarea id="e-exp" rows={3} className="input" value={f.expect || ''} onChange={set('expect')} /></Field>
        <Field label="Trivia" htmlFor="e-triv"><textarea id="e-triv" rows={2} className="input" value={f.trivia || ''} onChange={set('trivia')} /></Field>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}><Field label="Order on the day" htmlFor="e-sort"><input id="e-sort" type="number" className="input" value={f.sort} onChange={set('sort')} /></Field></div>
          <label className="row" style={{ flex: 1, minHeight: 74, paddingTop: 22 }}>
            <input type="checkbox" checked={f.published} onChange={(e) => setF((s) => ({ ...s, published: e.target.checked }))} style={{ width: 22, height: 22, accentColor: '#b08a2a' }} />
            Visible to guests
          </label>
        </div>

        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save event'}</button>
        {!isNew && <button type="button" className="btn danger" onClick={remove}>Delete event</button>}
      </form>
    </main>
  )
}
