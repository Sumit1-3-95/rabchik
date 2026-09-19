import { useAuth } from '../lib/auth'
import Icon from './Icon'

/** Instagram-style circles. Unseen circles have the gold→maroon ring and come first. */
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
            <div><div style={{ backgroundImage: g.cover ? `url(${g.cover})` : g.gradient, color: g.isPoll ? '#fff' : undefined }}>{g.isPoll && <Icon name="poll" size={24} stroke={2.2} />}</div></div>
          </div>
          <span>{g.label}</span>
        </button>
      ))}
    </div>
  )
}