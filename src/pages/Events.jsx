import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useQuery } from '../lib/hooks'
import { dayLabel } from '../lib/format'
import { useStories } from '../lib/stories'
import EventCard from '../components/EventCard'
import StoryRow from '../components/StoryRow'
import StoryViewer from '../components/StoryViewer'
import UploadSheet from '../components/UploadSheet'
import Icon from '../components/Icon'

const pad = (n) => String(n).padStart(2, '0')

/** Start time of an event in India time, from its date and a label like "11:00 AM" (or "Evening"). */
function startMs(e) {
  const t = e.time_label || ''
  const m = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m/i.exec(t)
  let h = 12, min = 0
  if (m) { h = (+m[1] % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0); min = +(m[2] || 0) }
  else if (/midnight/i.test(t)) { h = 23; min = 59 }
  else if (/morning/i.test(t)) h = 10
  else if (/afternoon/i.test(t)) h = 14
  else if (/evening/i.test(t)) h = 18
  else if (/night/i.test(t)) h = 20
  return Date.parse(`${e.event_date}T${pad(h)}:${pad(min)}:00+05:30`)
}

const parts = (d) => {
  const [y, m, day] = d.split('-').map(Number)
  const dt = new Date(y, m - 1, day)
  return {
    num: day,
    month: dt.toLocaleDateString('en-US', { month: 'long' }),
    weekday: dt.toLocaleDateString('en-US', { weekday: 'long' }),
  }
}

export default function Events() {
  const { isSuper } = useAuth()
  const events = useQuery(async () => {
    const { data, error } = await supabase.from('events').select('*').order('event_date').order('sort')
    if (error) throw error
    return data
  })
  const list = events.data || []
  const { groups, markSeen, refetch, error: storyError } = useStories(list)
  const loc = useLocation()

  const days = useMemo(() => [...new Set(list.map((e) => e.event_date))], [list])
  const [active, setActive] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [upload, setUpload] = useState({ open: false, eventId: '' })
  const scrolled = useRef(false)

  // the event whose start time is closest to right now
  const nearest = useMemo(() => {
    if (!list.length) return null
    const now = Date.now()
    return list.reduce((best, e) => (Math.abs(startMs(e) - now) < Math.abs(startMs(best) - now) ? e : best), list[0])
  }, [list])

  const jumpToDay = (d) => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // on arrival, scroll to the nearest event (or to the day we were sent from the editor)
  useEffect(() => {
    if (scrolled.current || !list.length) return
    const wantDay = loc.state?.day
    const t = setTimeout(() => {
      if (scrolled.current) return
      scrolled.current = true
      if (wantDay && days.includes(wantDay)) return jumpToDay(wantDay)
      if (nearest && nearest.id !== list[0].id) {
        document.getElementById(`ev-${nearest.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setFocusId(nearest.id)
        setTimeout(() => setFocusId(null), 2600)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [list, days, nearest, loc.state])

  // highlight the chip of the day you are reading
  useEffect(() => {
    if (!days.length) return
    let raf = 0
    const spy = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        let cur = days[0]
        for (const d of days) {
          const el = document.getElementById(`day-${d}`)
          if (el && el.getBoundingClientRect().top <= 150) cur = d
        }
        setActive(cur)
      })
    }
    spy()
    window.addEventListener('scroll', spy, { passive: true })
    return () => { window.removeEventListener('scroll', spy); cancelAnimationFrame(raf) }
  }, [days])

  const openViewer = (idx) => {
    // snapshot, so the circles re-sorting while you watch doesn't shuffle the viewer
    const snap = groups.map((g) => ({ ...g }))
    setViewer({ groups: snap, g: idx, i: snap[idx].firstUnseen })
  }

  return (
    <main className="page tight">
      <h1 className="title" style={{ fontSize: 30 }}>Events</h1>
      <StoryRow groups={groups} onOpen={openViewer} onAdd={() => setUpload({ open: true, eventId: '' })} />

      {days.length > 0 && (
        <nav className="daybar" aria-label="Jump to a day">
          {days.map((d) => (
            <button key={d} className={`chip daychip ${d === active ? 'on' : ''}`} aria-current={d === active ? 'true' : undefined} onClick={() => jumpToDay(d)}>
              {dayLabel(d)}
            </button>
          ))}
        </nav>
      )}

      {storyError && <div className="err">Stories could not load: {storyError.message}</div>}
      {events.loading && <div className="spinner" />}
      {events.error && <div className="err">Could not load events. Pull to refresh.</div>}

      {days.map((d) => {
        const p = parts(d)
        const todays = list.filter((e) => e.event_date === d)
        return (
          <section key={d} id={`day-${d}`} className="evday" aria-label={`${p.weekday}, ${p.num} ${p.month}`}>
            <div className="evdate">
              <div><strong>{p.weekday}</strong><span>{p.num} {p.month}</span></div>
              <i aria-hidden="true" />
              <em className="tag relative">{todays.length} {todays.length === 1 ? 'event' : 'events'}</em>
            </div>
            {todays.map((e) => (
              <div key={e.id} id={`ev-${e.id}`} className={`evwrap ${focusId === e.id ? 'focus' : ''}`}>
                <EventCard event={e} onAdd={(id) => setUpload({ open: true, eventId: id })} />
              </div>
            ))}
          </section>
        )
      })}

      {isSuper && (
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