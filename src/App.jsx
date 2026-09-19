import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import SetPin from './pages/SetPin'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import Moments from './pages/Moments'
import Engage from './pages/Engage'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import EventEdit from './pages/admin/EventEdit'
import EngageEdit from './pages/admin/EngageEdit'
import Guests from './pages/admin/Guests'

function Splash() {
  return <div className="app"><div className="spinner" aria-label="Loading" /></div>
}

/** Signed-in guests only. First login forces a new PIN. */
function Protected({ children, admin = false }) {
  const { session, profile, loading, isAdmin } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <div className="app page">
        <div className="card pad">
          <div className="h2">Almost there</div>
          <p className="muted" style={{ marginTop: 8 }}>
            Your number is not on the guest list yet. Please ask the family desk to add you.
          </p>
        </div>
      </div>
    )
  }
  if (admin && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { session, profile, loading } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={loading ? <Splash /> : session && profile ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/set-pin" element={loading ? <Splash /> : !session ? <Navigate to="/login" replace /> : <SetPin />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Home />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/moments" element={<Moments />} />
        <Route path="/engage" element={<Engage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/events/:id" element={<Protected admin><EventEdit /></Protected>} />
        <Route path="/admin/engage/:type/:id" element={<Protected admin><EngageEdit /></Protected>} />
        <Route path="/admin/guests" element={<Protected admin><Guests /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
