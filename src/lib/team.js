import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { phoneToEmail, pinToPassword } from './phone'

/**
 * Super admins add a team member here. The account is created with a separate, throw-away
 * client so the super admin stays signed in; then one database call sets the role and saves the PIN.
 */
export async function addTeamMember({ phone, name, pin, role }) {
  const tmp = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'rabchik-tmp' },
  })
  const { data, error } = await tmp.auth.signUp({
    email: phoneToEmail(phone), password: pinToPassword(pin), options: { data: { name } },
  })
  if (error) throw new Error(error.message)
  // A number that already has an account returns no identities: we then reset its PIN to the new one.
  const existed = !!(data.user && data.user.identities && data.user.identities.length === 0)
  const { error: e2 } = await supabase.rpc('team_upsert', { p_phone: phone, p_name: name, p_pin: pin, p_role: role, p_reset: existed })
  if (e2) throw new Error(e2.message)
}