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

  const alreadyHasAccount = /already/i.test(error)

  return (
    <main className="login">
      <div className="lg-top">
        <div className="kicker">Save the date</div>
        <h1 className="names">Anushika <em>weds</em> Saurabh</h1>
        <div className="small" style={{ color: '#5b4a2a' }}>Dec 10–11, 2026 · Jaipur · <b>#rabchik</b></div>
      </div>

      <img className="couple" src="/couple.webp" alt="" width="560" height="830" draggable="false" />

      <form className="card glass col lg-card" onSubmit={submit}>
        <div className="seg" role="tablist" aria-label="Log in or sign up">
          <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? 'on' : ''} onClick={() => switchMode('login')}>Log in</button>
          <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? 'on' : ''} onClick={() => switchMode('signup')}>Sign up</button>
        </div>

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

        {error && (
          <div className="errbox" role="alert">
            <div>{error}</div>
            <div className="row" style={{ gap: 8 }}>
              {!isSignup && <button type="button" className="errcta" onClick={() => switchMode('signup')}>New here? Sign up</button>}
              {isSignup && alreadyHasAccount && <button type="button" className="errcta" onClick={() => switchMode('login')}>Log in instead</button>}
              {isSignup && !alreadyHasAccount && <button type="button" className="errcta" onClick={() => switchMode('login')}>Have an account? Log in</button>}
            </div>
          </div>
        )}

        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create my account' : 'Enter'}</button>

        <div className="or"><span>or</span></div>
        <button type="button" className="btn ghost" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
          {isSignup ? 'I already have an account · Log in' : 'New here? Create an account'}
        </button>
      </form>
    </main>
  )
}