import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useQuery } from '../lib/hooks'
import { dayLabel, pickDay } from '../lib/format'
import { useStories } from '../lib/stories'
import EventCard from '../components/EventCard'
import StoryRow from '../components/StoryRow'
import StoryViewer from '../components/StoryViewer'
import UploadSheet from '../components/UploadSheet'
import Icon from '../components/Icon'

export default function Home() {
  const { isAdmin } = useAuth()
  const events = useQuery(async () => {
    const { data, error } = await supabase.from('events').select('*').order('event_date').order('sort')
    if (error) throw error
    return data
  })
  const list = events.data || []
  const { groups, markSeen, refetch } = useStories(list)

  const days = useMemo(() => [...new Set(list.map((e) => e.event_date))], [list])
  const [day, setDay] = useState(null)
  useEffect(() => { if (!day && days.length) setDay(pickDay(days)) }, [days, day])

  const [viewer, setViewer] = useState(null) // { groups, g, i }
  const [upload, setUpload] = useState({ open: false, eventId: '' })

  const openViewer = (idx) => {
    // snapshot, so the circles re-sorting while you watch doesn't shuffle the viewer
    const snap = groups.map((g) => ({ ...g }))
    setViewer({ groups: snap, g: idx, i: snap[idx].firstUnseen })
  }

  return (
    <main className="page tight">
      <StoryRow groups={groups} onOpen={openViewer} onAdd={() => setUpload({ open: true, eventId: '' })} />

      <div className="scroll-x" role="tablist" aria-label="Wedding days">
        {days.map((d) => (
          <button key={d} role="tab" aria-selected={d === day} className={`chip ${d === day ? 'on' : ''}`} onClick={() => setDay(d)}>
            {dayLabel(d)}
          </button>
        ))}
      </div>

      {events.loading && <div className="spinner" />}
      {events.error && <div className="err">Could not load events. Pull to refresh.</div>}

      {list.filter((e) => e.event_date === day).map((e) => (
        <EventCard key={e.id} event={e} onAdd={(id) => setUpload({ open: true, eventId: id })} />
      ))}

      {isAdmin && (
        <Link to="/admin/events/new" className="card row" style={{ justifyContent: 'center', minHeight: 72, border: '1.5px dashed rgba(176,138,42,.6)', background: 'rgba(255,255,255,.5)', boxShadow: 'none', color: 'var(--accent)', fontWeight: 600 }}>
          <Icon name="plus" stroke={2} /> Add event card
        </Link>
      )}

      {viewer && (
        <StoryViewer
          groups={viewer.groups} startGroup={viewer.g} startItem={viewer.i}
          onClose={() => setViewer(null)} onSeen={markSeen} onChanged={refetch}
        />
      )}
      <UploadSheet
        open={upload.open} onClose={() => setUpload((u) => ({ ...u, open: false }))}
        events={list} defaultEventId={upload.eventId} onDone={refetch}
      />
    </main>
  )
}
