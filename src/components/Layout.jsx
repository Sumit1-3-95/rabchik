import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToastState } from '../lib/hooks'
import { SITE } from '../config'
import Icon from './Icon'

function Drawer({ open, onClose }) {
  const { profile, session, isSuper, roleLabel, signOut } = useAuth()
  const nav = useNavigate()
  if (!open) return null
  const go = (to) => { onClose(); nav(to) }
  const signedIn = !!session && !!profile
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <aside className="drawer" aria-label="Menu">
        <div className="row" style={{ padding: '0 6px 18px' }}>
          <div className="slot" style={{ width: 52, height: 52, fontWeight: 700, fontSize: 20, borderStyle: 'solid', borderColor: 'transparent', background: 'var(--rose)', color: 'var(--maroon)' }}>
            {signedIn ? profile.name?.[0] : 'R'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{signedIn ? profile.name : 'Rabhchik'}</div>
            <div className="small muted">{signedIn ? roleLabel || 'Guest' : SITE.hashtag}</div>
          </div>
        </div>
        <button className="item" onClick={() => go('/')}><Icon name="mail" /> Invitation</button>
        <button className="item" onClick={() => go('/events')}><Icon name="cal" /> Events</button>
        <button className="item" onClick={() => go('/map')}><Icon name="pin" /> Venue map</button>
        <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" onClick={onClose}><Icon name="instagram" /> Instagram</a>
        {isSuper && (
          <>
            <div className="eyebrow" style={{ padding: '16px 14px 4px' }}>Super admin</div>
            <button className="item" onClick={() => go('/admin/events/new')}><Icon name="cal" /> Add event card</button>
            <button className="item" onClick={() => go('/admin/rsvps')}><Icon name="ticket" /> RSVPs</button>
            <button className="item" onClick={() => go('/admin/rooms')}><Icon name="bed" /> Room list</button>
            <button className="item" onClick={() => go('/admin/team')}><Icon name="users" /> Team &amp; PINs</button>
          </>
        )}
        <div style={{ flex: 1 }} />
        {signedIn
          ? <button className="item" onClick={() => { onClose(); signOut() }}><Icon name="out" /> Sign out</button>
          : <button className="item" onClick={() => go('/login')}><Icon name="user" /> Admin login</button>}
      </aside>
    </>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const toast = useToastState()
  const { pathname } = useLocation()
  // The event detail page has a full-bleed hero, so it hides the sticky header.
  const bare = /^\/events\//.test(pathname)
  // Admin screens have their own back button, so the header is hidden there too.
  const noHeader = bare || /^\/admin\//.test(pathname)
  // The invitation has its own deep-red "card" look, so the page behind it changes colour too.
  const invite = pathname === '/'
  useEffect(() => {
    document.body.classList.toggle('inv-body', invite)
    return () => document.body.classList.remove('inv-body')
  }, [invite])

  return (
    <div className={`app ${noHeader && !bare ? 'nohdr' : ''} ${invite ? 'invmode' : ''}`}>
      {!noHeader && (
        <header className="header">
          <button className="round glass" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="logo">RABHCHIK</div>
          <span style={{ width: 44 }} aria-hidden="true" />
        </header>
      )}
      <Outlet />
      <nav className="nav glass" aria-label="Main">
        {[['/', 'mail', 'Invite'], ['/events', 'cal', 'Events'], ['/moments', 'photos', 'Moments']].map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === '/'} aria-label={label} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={icon} stroke={1.8} />
          </NavLink>
        ))}
        <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" stroke={1.8} /></a>
      </nav>
      <Drawer open={open} onClose={() => setOpen(false)} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}