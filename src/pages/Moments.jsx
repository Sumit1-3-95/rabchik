import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useQuery } from '../lib/hooks'
import { dayLabel } from '../lib/format'
import { MEDIA_SELECT, fetchMyLikes, normMedia } from '../lib/media'
import StoryViewer from '../components/StoryViewer'
import UploadSheet from '../components/UploadSheet'
import Icon from '../components/Icon'
import Tile from '../components/Tile'

export default function Moments() {
  const { session, canUpload } = useAuth()
  const uid = session.user.id
  const [filter, setFilter] = useState('all') // all | <date> | videos | mine
  const [viewer, setViewer] = useState(null) // { items, i }
  const [upload, setUpload] = useState(false)
  const [limit, setLimit] = useState(120) // show in pages so a big gallery stays fast

  const q = useQuery(async () => {
    const [events, media, likes] = await Promise.all([
      supabase.from('events').select('id,title,event_date,sort').order('event_date').order('sort'),
      supabase.from('media').select(MEDIA_SELECT).order('created_at', { ascending: false }).limit(400),
      fetchMyLikes(uid),
    ])
    if (media.error) throw media.error
    return { events: events.data || [], media: (media.data || []).map((m) => normMedia(m, likes)) }
  }, [uid])

  const events = q.data?.events || []
  const evById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])
  const days = useMemo(() => [...new Set(events.map((e) => e.event_date))], [events])

  const filtered = useMemo(() => {
    let items = q.data?.media || []
    if (filter === 'videos') items = items.filter((m) => m.kind === 'video')
    else if (filter === 'mine') items = items.filter((m) => m.uploader === uid)
    else if (filter !== 'all') items = items.filter((m) => evById.get(m.eventId)?.event_date === filter)
    return items
  }, [q.data, filter, evById, uid])

  // section per event (in schedule order), plus "Other" for uploads without an event
  const sections = useMemo(() => {
    const by = new Map()
    for (const m of filtered.slice(0, limit)) {
      const k = m.eventId || 'none'
      if (!by.has(k)) by.set(k, [])
      by.get(k).push(m)
    }
    return [...by.entries()]
      .map(([k, items]) => ({ key: k, ev: evById.get(k), items }))
      .sort((a, b) => (a.ev ? events.indexOf(a.ev) : -1) - (b.ev ? events.indexOf(b.ev) : -1))
  }, [filtered, evById, events, limit])

  return (
    <main className="page tight">
      <div className="row between">
        <h1 className="title">Moments</h1>
        {canUpload && <button className="round glass" aria-label="Add photo or video" onClick={() => setUpload(true)}><Icon name="plus" stroke={2} /></button>}
      </div>

      <div className="scroll-x">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All</button>
        {days.map((d) => <button key={d} className={`chip ${filter === d ? 'on' : ''}`} onClick={() => setFilter(d)}>{dayLabel(d)}</button>)}
        <button className={`chip ${filter === 'videos' ? 'on' : ''}`} onClick={() => setFilter('videos')}>Videos</button>
        <button className={`chip ${filter === 'mine' ? 'on' : ''}`} onClick={() => setFilter('mine')}>Mine</button>
      </div>

      {q.error && <div className="err">Photos could not load: {q.error.message}</div>}
      {q.loading && <div className="spinner" />}
      {!q.loading && filtered.length === 0 && <div className="empty">Nothing here yet.{canUpload ? ' Tap + to add the first one.' : ''}</div>}

      {sections.map((s) => (
        <section key={s.key} className="col" style={{ gap: 10 }}>
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <h2 className="h2" style={{ fontSize: 19 }}>{s.ev?.title || 'Shared by guests'}</h2>
            <span className="small muted">{s.ev ? dayLabel(s.ev.event_date) : ''}</span>
          </div>
          <div className="grid3">
            {s.items.map((m) => (
              <Tile key={m.id} m={m} onClick={() => setViewer({ items: filtered, i: filtered.indexOf(m) })} />
            ))}
          </div>
        </section>
      ))}

      {filtered.length > limit && (
        <button className="btn ghost" onClick={() => setLimit((l) => l + 120)}>Show more ({filtered.length - limit} left)</button>
      )}

      {viewer && (
        <StoryViewer
          groups={[{ key: 'all', label: 'Moments', items: viewer.items }]} startItem={viewer.i}
          onClose={() => setViewer(null)} onChanged={q.refetch}
        />
      )}
      <UploadSheet open={upload} onClose={() => setUpload(false)} events={events} defaultEventId="" onDone={q.refetch} />
    </main>
  )
}