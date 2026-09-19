import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, mediaUrl } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useQuery } from '../lib/hooks'
import { dayLabel, gradient } from '../lib/format'
import { MEDIA_SELECT, fetchMyLikes, normMedia } from '../lib/media'
import StoryViewer from '../components/StoryViewer'
import UploadSheet from '../components/UploadSheet'
import Icon from '../components/Icon'

export default function EventDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { isAdmin, canUpload, session } = useAuth()
  const [slide, setSlide] = useState(0)
  const [viewer, setViewer] = useState(null)
  const [upload, setUpload] = useState(false)
  const slidesRef = useRef(null)

  const q = useQuery(async () => {
    const [ev, media, likes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).maybeSingle(),
      supabase.from('media').select(MEDIA_SELECT).eq('event_id', id).order('created_at', { ascending: false }).limit(60),
      fetchMyLikes(session.user.id),
    ])
    if (ev.error) throw ev.error
    return { event: ev.data, media: (media.data || []).map((m) => normMedia(m, likes)) }
  }, [id])

  if (q.loading) return <div className="spinner" />
  const ev = q.data?.event
  if (!ev) return <div className="page"><div className="empty">Event not found.</div></div>
  const media = q.data.media

  const banners = [...(ev.banner_urls || []), ev.display_image_url, ev.background_url].filter(Boolean).map(mediaUrl)
  const slides = banners.length ? banners.map((u) => `url(${u})`) : [gradient(ev.theme_colors)]
  const menu = (ev.menu_items || []).slice(0, 4)
  const allEvents = [{ id: ev.id, title: ev.title }]

  return (
    <div>
      <div className="hero">
        <div className="slides" ref={slidesRef} onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {slides.map((bg, i) => <div key={i} className="slide" style={{ backgroundImage: bg }} />)}
        </div>
        <button className="round glass back" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        {isAdmin && <Link to={`/admin/events/${ev.id}`} className="round glass edit" aria-label="Edit event"><Icon name="pencil" size={18} /></Link>}
        {slides.length > 1 && (
          <div className="dots glass" aria-hidden="true">
            {slides.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}
          </div>
        )}
      </div>

      <div className="sheet-top">
        <div className="col">
          <h1 className="title" style={{ fontSize: 34, lineHeight: 1 }}>{ev.title}</h1>
          <div className="scroll-x">
            <span className="chip"><Icon name="clock" size={15} />{dayLabel(ev.event_date)}{ev.time_label ? ` · ${ev.time_label}` : ''}</span>
            {ev.venue && (
              ev.maps_url
                ? <a className="chip link" href={ev.maps_url} target="_blank" rel="noreferrer"><Icon name="pin" size={15} />{ev.venue}</a>
                : <span className="chip"><Icon name="pin" size={15} />{ev.venue}</span>
            )}
            {ev.dress_code && <span className="chip">{ev.dress_code}</span>}
            {ev.theme_label && (
              <span className="chip">
                {(ev.theme_colors || []).slice(0, 2).map((c, i) => (
                  <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: c, marginLeft: i ? -8 : 0 }} />
                ))}
                {ev.theme_label}
              </span>
            )}
          </div>
        </div>

        {menu.length > 0 && (
          <div className="col" style={{ gap: 10 }}>
            <div className="label">Menu</div>
            <div className="plates">
              {menu.map((m, i) => {
                const u = mediaUrl(m.image_url)
                return (
                  <div className="plate" key={i}>
                    <div style={{ backgroundImage: u ? `url(${u})` : gradient(ev.theme_colors) }}>
                      {!u && <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="rgba(255,255,255,.55)" /><circle cx="20" cy="20" r="8" fill="rgba(255,255,255,.75)" /></svg>}
                    </div>
                    <span>{m.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {ev.expect && (
          <div className="col" style={{ gap: 8 }}>
            <div className="label">What to expect</div>
            <div className="card pad" style={{ borderRadius: 20, lineHeight: 1.5, fontSize: 14 }}>{ev.expect}</div>
          </div>
        )}

        {ev.trivia && (
          <div style={{ background: '#efece4', borderRadius: 20, padding: '14px 16px', fontSize: 14, lineHeight: 1.5 }}>
            <b>Did you know?</b> {ev.trivia}
          </div>
        )}

        <div className="col" style={{ gap: 10, paddingBottom: 130 }}>
          <div className="row between">
            <div className="label">Photos &amp; videos</div>
            {canUpload && <button className="chip" onClick={() => setUpload(true)}><Icon name="plus" size={14} stroke={2} />Add</button>}
          </div>
          {media.length === 0 ? (
            <div className="empty">No photos yet{canUpload ? '. Be the first to add one.' : '.'}</div>
          ) : (
            <div className="grid4">
              {media.slice(0, 12).map((m, i) => (
                <button key={m.id} className="tile" aria-label="Open photo" onClick={() => setViewer(i)}
                  style={m.kind === 'image' ? { backgroundImage: `url(${m.url})` } : undefined}>
                  {m.kind === 'video' && <><video src={`${m.url}#t=0.1`} preload="metadata" muted playsInline /><span className="play glass"><Icon name="play" size={11} fill="currentColor" /></span></>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewer !== null && (
        <StoryViewer groups={[{ key: ev.id, label: ev.title, items: media }]} startItem={viewer} onClose={() => setViewer(null)} onChanged={q.refetch} />
      )}
      <UploadSheet open={upload} onClose={() => setUpload(false)} events={allEvents} defaultEventId={ev.id} onDone={q.refetch} />
    </div>
  )
}