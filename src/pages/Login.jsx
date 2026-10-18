import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { normPhone } from '../lib/phone'
import { SITE } from '../config'

/** Only for the team (admins) who upload photos. Everyone else just uses the app without logging in. */
export default function Login() {
  const { signIn } = useAuth()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (normPhone(phone).length !== 10) return setError('Enter your 10-digit mobile number')
    if (!/^\d{4}$/.test(pin)) return setError('PIN is 4 digits')
    setBusy(true)
    try {
      await signIn(phone, pin)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="lg-top">
        <div className="kicker">Admin login</div>
        <h1 className="names">Anushika <em>weds</em> Saurabh</h1>
        <div className="small" style={{ color: '#5b4a2a' }}>{SITE.datesLine} · {SITE.city.split(',')[0]} · <b>{SITE.hashtag}</b></div>
      </div>

      <img className="couple" src="/couple.webp" alt="" width="560" height="830" draggable="false" />

      <form className="card glass col lg-card" onSubmit={submit}>
        <div className="small muted" style={{ textAlign: 'center' }}>For the wedding team who add photos and videos. Guests do not need to log in.</div>
        <div className="field">
          <label className="label" htmlFor="phone">Phone number</label>
          <input id="phone" className="input" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="pin">PIN</label>
          <input id="pin" className="input" type="password" inputMode="numeric" autoComplete="current-password" maxLength={4} placeholder="4 digits" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </div>

        {error && (
          <div className="errbox" role="alert">
            <div>{error}</div>
            <div className="small">Ask Saurabh, Anushika or the family desk for your PIN.</div>
          </div>
        )}

        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
        <div className="or"><span>or</span></div>
        <Link to="/" className="btn ghost" style={{ textAlign: 'center', textDecoration: 'none' }}>Continue without login</Link>
      </form>
    </main>
  )
}