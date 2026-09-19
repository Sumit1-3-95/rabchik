import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { gradient } from '../lib/format'
import { mediaUrl } from '../lib/supabase'
import Icon from './Icon'

export default function EventCard({ event, onAdd }) {
  const { isAdmin, canPost } = useAuth()
  const img = mediaUrl(event.display_image_url || event.banner_urls?.[0])
  return (
    <div className="ecard">
      <Link to={`/events/${event.id}`} className="body">
        <div className="img" style={{ backgroundImage: img ? `url(${img})` : gradient(event.theme_colors) }} />
        <div className="meta">
          <div className="name">{event.title}</div>
          <div className="small muted">{[event.time_label, event.venue].filter(Boolean).join(' · ')}</div>
        </div>
      </Link>
      {canPost && (
        <button className="round glass add" aria-label={`Add photos or videos to ${event.title}`} onClick={() => onAdd(event.id)}>
          <Icon name="plus" stroke={2} />
        </button>
      )}
      {isAdmin && (
        <Link className="round glass edit" to={`/admin/events/${event.id}`} aria-label={`Edit ${event.title}`}>
          <Icon name="pencil" size={18} />
        </Link>
      )}
    </div>
  )
}
