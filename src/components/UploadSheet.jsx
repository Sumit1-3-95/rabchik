import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { checkFile, uploadFile } from '../lib/upload'
import { toast } from '../lib/hooks'
import Sheet from './Sheet'
import Icon from './Icon'

/** Upload photos/videos to an event. Optionally share them as a story. */
export default function UploadSheet({ open, onClose, events, defaultEventId, onDone }) {
  const { session } = useAuth()
  const [eventId, setEventId] = useState(defaultEventId || '')
  const [asStory, setAsStory] = useState(true)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const ref = useRef(null)

  // keep the event in sync when opened from a card
  const [lastDefault, setLastDefault] = useState(defaultEventId)
  if (defaultEventId !== lastDefault) { setLastDefault(defaultEventId); setEventId(defaultEventId || '') }

  const pick = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setError('')
    setBusy(true)
    try {
      const checked = []
      for (const f of files) checked.push({ f, ...(await checkFile(f)) })
      for (let n = 0; n < checked.length; n++) {
        const { f, kind, duration } = checked[n]
        setProgress(`Uploading ${n + 1} of ${checked.length}…`)
        let path
        try { path = await uploadFile(f, session.user.id) } catch (e2) { console.error('upload step failed', e2); throw e2 }
        const { error: err } = await supabase.from('media').insert({
          event_id: eventId || null, uploader: session.user.id, kind, path,
          caption: caption.trim() || null, is_story: asStory, duration,
        }).select('id').single()
        if (err) throw new Error(`Could not save the post: ${err.message}`)
      }
      toast(checked.length > 1 ? `${checked.length} uploaded` : 'Uploaded')
      setCaption('')
      onDone?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Upload failed')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <Sheet open={open} onClose={busy ? () => {} : onClose} title="Add photos or videos">
      <div className="field">
        <label className="label" htmlFor="up-event">Event</label>
        <select id="up-event" className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">No specific event</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="up-cap">Caption (optional)</label>
        <input id="up-cap" className="input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} placeholder="Say something" />
      </div>
      <label className="row" style={{ gap: 12 }}>
        <input type="checkbox" checked={asStory} onChange={(e) => setAsStory(e.target.checked)} style={{ width: 22, height: 22, accentColor: '#b08a2a' }} />
        <span>Also show in the stories circles at the top</span>
      </label>
      {error && <div className="err" role="alert">{error}</div>}
      <button className="btn" disabled={busy} onClick={() => ref.current.click()}>
        <Icon name="upload" color="#fff" /> {busy ? progress || 'Working…' : 'Choose photos or videos'}
      </button>
      <div className="small muted" style={{ textAlign: 'center' }}>Videos up to 60 seconds, up to 100 MB each.</div>
      <input ref={ref} type="file" accept="image/*,video/*" multiple hidden onChange={pick} />
    </Sheet>
  )
}