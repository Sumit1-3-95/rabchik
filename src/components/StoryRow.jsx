import { useAuth } from '../lib/auth'
import { useState } from 'react'
import Icon from './Icon'

/** Circle picture: small preview first, full photo if there is no preview (older uploads). Gradient behind, so it is never blank. */
function Cover({ g }) {
  const [full, setFull] = useState(!g.coverThumb)
  const src = full ? g.cover : g.coverThumb
  return (
    <div style={{ backgroundImage: g.gradient, color: g.isPoll ? '#fff' : undefined, position: 'relative', overflow: 'hidden' }}>
      {src && <img src={src} alt="" decoding="async" onError={() => (full ? null : setFull(true))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      {g.isPoll && <Icon name="poll" size={24} stroke={2.2} />}
    </div>
  )
}

/** Instagram-style circles. Unseen circles have a green ring and come first; seen ones go grey at the end. */
export default function StoryRow({ groups, onOpen, onAdd }) {
  const { canUpload } = useAuth()
  return (
    <div className="stories" role="list">
      {canUpload && (
        <button className="story" role="listitem" onClick={onAdd} aria-label="Add your story">
          <div className="ring" style={{ background: 'linear-gradient(135deg, var(--rose), var(--gold))' }}>
            <div><div style={{ background: 'var(--rose)' }}><Icon name="plus" stroke={2.2} /></div></div>
          </div>
          <span>Your story</span>
        </button>
      )}
      {groups.map((g, i) => (
        <button key={g.key} role="listitem" className={`story ${g.unseen ? '' : 'seen'}`} onClick={() => onOpen(i)} aria-label={`${g.label} stories`}>
          <div className="ring">
            <div><Cover key={g.cover || g.key} g={g} /></div>
          </div>
          {g.unseen && g.unseenCount > 0 && <em className="cnt" aria-label={`${g.unseenCount} new`}>{g.unseenCount > 9 ? '9+' : g.unseenCount}</em>}
          <span>{g.label}</span>
        </button>
      ))}
    </div>
  )
}