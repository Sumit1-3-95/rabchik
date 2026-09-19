import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToastState } from '../lib/hooks'
import Icon from './Icon'

const MAPS_URL = 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7'

function Drawer({ open, onClose }) {
  const { profile, isAdmin, signOut } = useAuth()
  const nav = useNavigate()
  if (!open) return null
  const go = (to) => { onClose(); nav(to) }
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <aside className="drawer" aria-label="Menu">
        <div className="row" style={{ padding: '0 6px 18px' }}>
          <div className="slot" style={{ width: 52, height: 52, fontWeight: 700, fontSize: 20, borderStyle: 'solid', borderColor: 'transparent', background: 'var(--rose)', color: 'var(--maroon)' }}>
            {profile?.name?.[0] || 'G'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{profile?.name}</div>
            <div className="small muted">{profile?.room_no ? `Room ${profile.room_no}` : 'Guest'}</div>
          </div>
        </div>
        <button className="item" onClick={() => go('/settings')}><Icon name="gear" /> Settings</button>
        <button className="item" onClick={() => go('/profile')}><Icon name="users" /> Community</button>
        <a href={MAPS_URL} target="_blank" rel="noreferrer" onClick={onClose}><Icon name="pin" /> Venue map</a>
        {isAdmin && (
          <>
            <div className="eyebrow" style={{ padding: '16px 14px 4px' }}>Admin</div>
            <button className="item" onClick={() => go('/admin/events/new')}><Icon name="cal" /> Add event card</button>
            <button className="item" onClick={() => go('/admin/engage/poll/new')}><Icon name="poll" /> Add poll, trivia or game</button>
            <button className="item" onClick={() => go('/admin/guests')}><Icon name="users" /> Guests &amp; PINs</button>
            <button className="item" onClick={() => go('/admin/admins')}><Icon name="user" /> Manage admins</button>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button className="item" onClick={() => { onClose(); signOut() }}><Icon name="out" /> Sign out</button>
      </aside>
    </>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const toast = useToastState()
  const { pathname } = useLocation()
  const { profile } = useAuth()
  // The event detail page has a full-bleed hero, so it hides the sticky header.
  const bare = /^\/events\//.test(pathname)
  // Admin and settings screens have their own back button, so the header is hidden there too.
  const noHeader = bare || /^\/admin\//.test(pathname) || pathname === '/settings'

  return (
    <div className={`app ${noHeader && !bare ? 'nohdr' : ''}`}>
      {!noHeader && (
        <header className="header">
          <button className="round glass" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="logo">RABCHIK</div>
          <Link to="/profile" className="round glass" aria-label="Profile" style={{ fontWeight: 700 }}>
            {profile?.name?.[0] || <Icon name="user" />}
          </Link>
        </header>
      )}
      <Outlet />
      <nav className="nav glass" aria-label="Main">
        {[['/', 'home', 'Home'], ['/moments', 'photos', 'Moments'], ['/engage', 'heart', 'Play along'], ['/profile', 'user', 'Profile']].map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === '/'} aria-label={label} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={icon} stroke={1.8} />
          </NavLink>
        ))}
      </nav>
      <Drawer open={open} onClose={() => setOpen(false)} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}