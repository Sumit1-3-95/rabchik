// Guests log in with phone + 4-digit PIN. Under the hood each guest is a Supabase
// email/password user with a synthetic email. Keep these three functions identical to
// supabase/functions/admin-guests/index.ts and scripts/seed-guests.mjs.

export const normPhone = (v) => (v || '').replace(/\D/g, '').slice(-10)
export const phoneToEmail = (p) => `91${normPhone(p)}@guests.rabchik.app`
export const pinToPassword = (pin) => `${pin}#rabchik`
export const DEFAULT_PIN = '1234'
