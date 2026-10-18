import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Events from './pages/Events'
import Invite from './pages/Invite' // the landing page, so it loads with the app
const EventDetail = lazy(() => import('./pages/EventDetail'))
const VenueMap = lazy(() => import('./pages/VenueMap'))
const Moments = lazy(() => import('./pages/Moments'))
const EventEdit = lazy(() => import('./pages/admin/EventEdit'))
const Team = lazy(() => import('./pages/admin/Team'))

function Splash() {
  return <div className="app"><div className="spinner" aria-label="Loading" /></div>
}

/** Super admins only (edit event cards, manage the team). Everyone else is sent home. */
function SuperOnly({ children }) {
  const { isSuper } = useAuth()
  return isSuper ? children : <Navigate to="/" replace />
}

export default function App() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Splash />
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/login" element={session && profile ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Invite />} />
          <Route path="/events" element={<Events />} />
          <Route path="/home" element={<Navigate to="/events" replace />} />
          <Route path="/map" element={<VenueMap />} />
          <Route path="/invite" element={<Navigate to="/" replace />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/moments" element={<Moments />} />
          <Route path="/admin/events/:id" element={<SuperOnly><EventEdit /></SuperOnly>} />
          <Route path="/admin/team" element={<SuperOnly><Team /></SuperOnly>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}