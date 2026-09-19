// Bulk-import guests from guests.csv  →  creates their login (PIN 1234) and profile.
//
//   1. Copy guests.sample.csv to guests.csv and fill in your guest list
//      Columns: name,phone,role,room_no,side      (role: admin | friend | relative, side: bride | groom)
//   2. Put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
//   3. npm run seed:guests
//
// Safe to re-run: guests that already exist are updated, not duplicated.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

// Must match src/lib/phone.js
const normPhone = (v) => (v || '').replace(/\D/g, '').slice(-10)
const phoneToEmail = (p) => `91${normPhone(p)}@guests.rabchik.app`
const pinToPassword = (pin) => `${pin}#rabchik`

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
  const head = rows.shift().map((h) => h.toLowerCase())
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

const file = process.argv[2] || 'guests.csv'
const guests = parseCsv(readFileSync(file, 'utf8'))
console.log(`Importing ${guests.length} guests from ${file}…`)

// Existing auth users (to make re-runs safe)
const existing = new Map()
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error
  data.users.forEach((u) => existing.set(u.email, u.id))
  if (data.users.length < 1000) break
}

let created = 0, updated = 0, failed = 0
for (const g of guests) {
  const phone = normPhone(g.phone)
  if (phone.length !== 10 || !g.name) { console.warn('Skipping (bad row):', g); failed++; continue }
  const email = phoneToEmail(phone)
  let id = existing.get(email)
  if (!id) {
    const { data, error } = await supabase.auth.admin.createUser({
      email, password: pinToPassword('1234'), email_confirm: true,
    })
    if (error) { console.warn(`✗ ${g.name}: ${error.message}`); failed++; continue }
    id = data.user.id
    created++
  } else updated++
  const role = ['admin', 'friend', 'relative'].includes(g.role) ? g.role : 'relative'
  const side = ['bride', 'groom'].includes(g.side) ? g.side : null
  const { error } = await supabase.from('profiles').upsert({
    id, phone, name: g.name, role, room_no: g.room_no || null, side,
  })
  if (error) { console.warn(`✗ ${g.name}: ${error.message}`); failed++ }
}
console.log(`Done. Created ${created}, updated ${updated}, failed ${failed}.`)
