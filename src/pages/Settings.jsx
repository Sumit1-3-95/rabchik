import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { pinToPassword } from '../lib/phone'
import { toast } from '../lib/hooks'
import Icon from '../components/Icon'

export default function Settings() {
  const { changePin, signOut, session } = useAuth()
  const nav = useNavigate()
  const [cur, setCur] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, ''))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(pin)) return setError('New PIN must be 4 digits')
    if (pin !== pin2) return setError('New PINs do not match')
    setBusy(true)
    try {
      // verify the current PIN by re-authenticating
      const { error: err } = await supabase.auth.signInWithPassword({ email: session.user.email, password: pinToPassword(cur) })
      if (err) throw new Error('Current PIN is wrong')
      await changePin(pin)
      setCur(''); setPin(''); setPin2('')
      toast('PIN updated')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page tight">
      <div className="row">
        <button className="round glass" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="title" style={{ fontSize: 28 }}>Settings</h1>
      </div>
      <form className="card col" style={{ padding: '20px 18px' }} onSubmit={submit}>
        <h2 className="h2">Change PIN</h2>
        <div className="field"><label className="label" htmlFor="cp">Current PIN</label><input id="cp" className="input" type="password" inputMode="numeric" maxLength={4} value={cur} onChange={digits(setCur)} /></div>
        <div className="field"><label className="label" htmlFor="np">New PIN</label><input id="np" className="input" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={digits(setPin)} /></div>
        <div className="field"><label className="label" htmlFor="np2">Confirm new PIN</label><input id="np2" className="input" type="password" inputMode="numeric" maxLength={4} value={pin2} onChange={digits(setPin2)} /></div>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Update PIN'}</button>
      </form>
      <button className="btn secondary" onClick={signOut}>Sign out</button>
    </main>
  )
}
