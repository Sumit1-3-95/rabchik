import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { phoneToEmail, pinToPassword } from './phone'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('id,name,role,room_no,side,must_change_pin')
      .eq('id', uid)
      .maybeSingle()
    setProfile(data)
    setProfileReady(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // 'loading' → 'none' (signed out) or the user id; re-runs whenever that changes
  const sessionKey = session === undefined ? 'loading' : session?.user?.id || 'none'
  useEffect(() => {
    if (sessionKey === 'loading') return
    if (sessionKey === 'none') {
      setProfile(null)
      setProfileReady(true)
    } else {
      setProfileReady(false)
      loadProfile(sessionKey)
    }
  }, [sessionKey, loadProfile])

  const signIn = useCallback(async (phone, pin) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: pinToPassword(pin),
    })
    if (error) {
      throw new Error(error.message === 'Invalid login credentials' ? 'Wrong phone number or PIN' : error.message)
    }
  }, [])

  // The database trigger (supabase/signup.sql) creates the profile from this metadata.
  const signUp = useCallback(async ({ phone, name, pin, side }) => {
    const email = phoneToEmail(phone)
    const password = pinToPassword(pin)
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, side } } })
    if (error) throw new Error(error.message)
    // A repeat sign-up for an existing number returns a user with no identities.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('This number already has an account. Please log in.')
    }
    if (!data.session) await signIn(phone, pin)
  }, [signIn])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const changePin = useCallback(async (newPin) => {
    const { error } = await supabase.auth.updateUser({ password: pinToPassword(newPin) })
    if (error) throw new Error(error.message)
    await supabase.rpc('mark_pin_changed')
    await loadProfile(session.user.id)
  }, [session?.user?.id, loadProfile])

  const value = useMemo(() => {
    const role = profile?.role
    return {
      session,
      profile,
      loading: session === undefined || !profileReady,
      isAdmin: role === 'admin',
      canPost: role === 'admin' || role === 'friend',
      canUpload: !!role, // every guest can share photos and videos
      signIn,
      signUp,
      signOut,
      changePin,
      reload: () => session?.user && loadProfile(session.user.id),
    }
  }, [session, profile, profileReady, signIn, signUp, signOut, changePin, loadProfile])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}