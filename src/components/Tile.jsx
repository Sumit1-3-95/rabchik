import { useState } from 'react'
import Icon from './Icon'

/** Grid tile: loads the small preview lazily; falls back to the full file for older uploads. */
export default function Tile({ m, onClick }) {
  const [full, setFull] = useState(!m.thumb) // true = thumbnail missing, use the original
  const isVideo = m.kind === 'video'
  return (
    <button className="tile" aria-label={`Open ${isVideo ? 'video' : 'photo'}`} onClick={onClick}>
      {(!isVideo || !full) && (
        <img src={full ? m.url : m.thumb} alt="" loading="lazy" decoding="async" onError={() => setFull(true)} />
      )}
      {isVideo && full && <video src={`${m.url}#t=0.1`} preload="none" muted playsInline />}
      {isVideo && <span className="play glass"><Icon name="play" size={11} fill="currentColor" /></span>}
    </button>
  )
}