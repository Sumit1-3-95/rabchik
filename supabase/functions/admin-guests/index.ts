// Supabase Edge Function: admin-guests
// Lets an ADMIN create guests, edit them, reset their PIN back to 1234, or delete them.
// Deploy:  supabase functions deploy admin-guests
// (SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Must match src/lib/phone.js
const normPhone = (v: string) => (v || '').replace(/\D/g, '').slice(-10)
const phoneToEmail = (p: string) => `91${normPhone(p)}@guests.rabchik.app`
const pinToPassword = (pin: string) => `${pin}#rabchik`
const DEFAULT_PIN = '1234'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Who is calling?
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(url, service)
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') return json({ error: 'Admins only' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Bad request' }, 400) }

  try {
    switch (body.action) {
      case 'create': {
        const phone = normPhone(body.phone)
        if (phone.length !== 10) return json({ error: 'Enter a 10-digit phone number' }, 400)
        if (!body.name) return json({ error: 'Name is required' }, 400)
        const { data, error } = await admin.auth.admin.createUser({
          email: phoneToEmail(phone),
          password: pinToPassword(DEFAULT_PIN),
          email_confirm: true,
        })
        if (error) return json({ error: error.message }, 400)
        const { error: e2 } = await admin.from('profiles').insert({
          id: data.user.id, phone, name: body.name,
          role: body.role ?? 'relative', room_no: body.room_no || null, side: body.side || null,
          must_change_pin: true,
        })
        if (e2) { await admin.auth.admin.deleteUser(data.user.id); return json({ error: e2.message }, 400) }
        return json({ ok: true, id: data.user.id })
      }
      case 'update': {
        const patch: Record<string, unknown> = {}
        for (const k of ['name', 'role', 'room_no', 'side']) if (k in body) patch[k] = body[k] || null
        if (patch.name === null) delete patch.name
        if (patch.role === null) delete patch.role
        const { error } = await admin.from('profiles').update(patch).eq('id', body.id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }
      case 'reset_pin': {
        const { error } = await admin.auth.admin.updateUserById(body.id, { password: pinToPassword(DEFAULT_PIN) })
        if (error) return json({ error: error.message }, 400)
        await admin.from('profiles').update({ must_change_pin: true }).eq('id', body.id)
        return json({ ok: true })
      }
      case 'delete': {
        if (body.id === user.id) return json({ error: 'You cannot delete yourself' }, 400)
        const { error } = await admin.auth.admin.deleteUser(body.id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }
      default:
        return json({ error: 'Unknown action' }, 400)
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
