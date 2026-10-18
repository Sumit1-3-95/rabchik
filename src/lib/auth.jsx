import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { phoneToEmail, pinToPassword } from './phone'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

/**
 * Three kinds of visitors:
 *  - public (not signed in): can view everything
 *  - admin  (DB role "friend"): can also upload photos/videos, like and comment
 *  - super admin (DB role "admin"): can also edit event cards and manage the team
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('id,name,role').eq('id', uid).maybeSingle()
    setProfile(data)
    setProfileReady(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

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

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo(() => {
    const role = profile?.role
    return {
      session,
      profile,
      loading: session === undefined || !profileReady,
      isSuper: role === 'admin', // edit event cards, manage the team
      canUpload: role === 'admin' || role === 'friend', // upload, like, comment
      roleLabel: role === 'admin' ? 'Super admin' : role === 'friend' ? 'Admin' : null,
      signIn,
      signOut,
    }
  }, [session, profile, profileReady, signIn, signOut])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}