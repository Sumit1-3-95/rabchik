import { useRef, useState } from 'react'
import { mediaUrl } from '../lib/supabase'
import { uploadFile } from '../lib/upload'
import Icon from './Icon'

export function Field({ label, htmlFor, children }) {
  return (
    <div className="field">
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
    </div>
  )
}

/** Single image picker that uploads immediately and returns the storage path via onChange. */
export function ImageInput({ label, value, onChange, folder = 'events', round = false, size }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadFile(file, folder))
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }
  const url = mediaUrl(value)
  return (
    <div className="field">
      {label && <div className="label">{label}</div>}
      <button
        type="button"
        onClick={() => ref.current.click()}
        aria-label={label || 'Upload image'}
        className="upload-tile"
        style={{
          width: size || '100%', height: size || 84, aspectRatio: 'auto', borderRadius: round ? '50%' : 18,
          backgroundImage: url ? `url(${url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      >
        {!url && (busy ? <span className="small">Uploading…</span> : <Icon name="upload" color="var(--accent)" />)}
      </button>
      {url && (
        <button type="button" className="small muted" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => onChange(null)}>
          Remove
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  )
}
