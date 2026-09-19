import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Shown on first login (forced) and reused from Settings via the same rules. */
export default function SetPin() {
  const { changePin, profile, signOut } = useAuth()
  const nav = useNavigate()
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(pin)) return setError('PIN must be 4 digits')
    if (pin === '1234') return setError('Please choose a PIN other than 1234')
    if (pin !== pin2) return setError('PINs do not match')
    setBusy(true)
    try {
      await changePin(pin)
      nav('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div style={{ flex: 1 }} />
      <div className="col" style={{ textAlign: 'center' }}>
        <div className="logo" style={{ padding: 0 }}>RABCHIK</div>
        <h1 className="names" style={{ fontSize: 36 }}>Welcome{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}</h1>
        <p className="muted">Set your own 4-digit PIN to continue.</p>
      </div>
      <form className="card glass col" style={{ padding: 18 }} onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="np">New PIN</label>
          <input id="np" className="input" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="field">
          <label className="label" htmlFor="np2">Confirm PIN</label>
          <input id="np2" className="input" type="password" inputMode="numeric" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save PIN'}</button>
        <button type="button" className="btn secondary" onClick={signOut}>Sign out</button>
      </form>
      <div style={{ flex: 1 }} />
    </main>
  )
}
