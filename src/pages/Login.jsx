import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { normPhone } from '../lib/phone'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [side, setSide] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'

  const switchMode = (m) => { setMode(m); setError(''); setPin('') }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (normPhone(phone).length !== 10) return setError('Enter your 10-digit mobile number')
    if (isSignup && !name.trim()) return setError('Enter your name')
    if (isSignup && !side) return setError('Choose Saurabh’s or Anushika’s side')
    if (!/^\d{4}$/.test(pin)) return setError('PIN is 4 digits')
    setBusy(true)
    try {
      if (isSignup) await signUp({ phone, name: name.trim(), pin, side })
      else await signIn(phone, pin)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="blob" style={{ top: -80, left: -60, width: 300, height: 300, background: 'var(--rose)', opacity: 0.5 }} />
      <div className="blob" style={{ bottom: -60, right: -60, width: 300, height: 300, background: 'var(--gold)', opacity: 0.25 }} />

      <div className="arch">
        {/* Swap these for the caricatures: put bride.png / groom.png in /public and use <img src="/bride.png" /> */}
        <div className="slot" style={{ marginRight: -8 }}>Bride<br />caricature</div>
        <div className="slot">Groom<br />caricature</div>
      </div>

      <div className="col" style={{ gap: 10, textAlign: 'center' }}>
        <h1 className="names">Saurabh <em>&amp;</em> Anushika</h1>
        <div className="logo" style={{ padding: 0 }}>RABCHIK</div>
        <div className="small muted">Dec 10–11, 2026 · Jaipur</div>
      </div>

      <div style={{ flex: 1 }} />

      <form className="card glass col pad" style={{ padding: 18 }} onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="phone">Phone number</label>
          <input id="phone" className="input" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {isSignup && (
          <>
            <div className="field">
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="side">Side</label>
              <select id="side" className="input" value={side} onChange={(e) => setSide(e.target.value)}>
                <option value="">Choose…</option>
                <option value="groom">Saurabh’s side</option>
                <option value="bride">Anushika’s side</option>
              </select>
            </div>
          </>
        )}
        <div className="field">
          <label className="label" htmlFor="pin">{isSignup ? 'Create a 4-digit PIN' : 'PIN'}</label>
          <input id="pin" className="input" type="password" inputMode="numeric" autoComplete={isSignup ? 'new-password' : 'current-password'} maxLength={4} placeholder="4 digits" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Enter'}</button>
      </form>
      <div className="small muted" style={{ textAlign: 'center' }}>
        {isSignup ? 'Already have an account? ' : 'New here? '}
        <button type="button" onClick={() => switchMode(isSignup ? 'login' : 'signup')} style={{ background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 700, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>
          {isSignup ? 'Log in' : 'Sign up'}
        </button>
      </div>
    </main>
  )
}
