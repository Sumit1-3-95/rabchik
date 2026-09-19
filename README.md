# Rabchik — Saurabh & Anushika's wedding app

A guest PWA: React + Vite, Supabase (auth, database, storage), hosted on Vercel.

**Roles:** `admin` edits everything · `friend` can upload, vote, and write · `relative` can view, like and comment.
**Login:** phone number + 4-digit PIN. Everyone starts on `1234` and must set their own PIN on first login.

---

## 1. Run it locally (VS Code)

```bash
npm install
cp .env.example .env.local      # then fill in the values (step 2)
npm run dev                     # http://localhost:5173
```

## 2. Set up Supabase (10 minutes, one time)

1. Create a project at supabase.com (you already have Pro).
2. **SQL Editor → New query**: paste `supabase/schema.sql` → Run. Then paste `supabase/seed.sql` → Run
   (this adds the events, polls and games from the wedding plan; edit them later in the app).
3. **Authentication → Providers → Email**: keep it enabled, and **turn OFF "Allow new users to sign up"**
   (Authentication → Sign In / Providers). Only people you add can log in.
4. **Project Settings → API**: copy the *Project URL* and *anon public* key into `.env.local`
   as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. **Storage → Settings**: make sure the global upload limit is 100 MB or more (Pro allows it).
6. Deploy the admin function (lets admins add guests and reset PINs from inside the app):

   ```bash
   npm install -g supabase            # or: brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy admin-guests
   ```

## 3. Add your guests

Copy `scripts/guests.sample.csv` to `guests.csv` (it is git-ignored), fill in the list
(`name,phone,role,room_no,side` — role is `admin | friend | relative`, side is `bride | groom`), then:

1. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → *service_role*) to `.env.local`.
   **Never put the service-role key in Vercel or in git.**
2. `npm run seed:guests`

Make yourself, Saurabh and Anushika `admin`. After that you can add/edit guests, change rooms and reset PINs
in the app: **hamburger menu → Guests & PINs**.

## 4. Deploy: GitHub → Vercel

```bash
git init && git add . && git commit -m "Rabchik wedding app"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/YOU/rabchik.git
git push -u origin main
```

In Vercel: **Add New → Project → import the repo** (framework: Vite is auto-detected). Add the two environment
variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and deploy. Every `git push` redeploys.
Share the Vercel link with guests; on a phone they can "Add to Home Screen" to install it.

## 5. Make it yours

- **Caricatures:** put `bride.png` / `groom.png` in `/public`, then in `src/pages/Login.jsx` replace the two
  `.slot` placeholders with `<img src="/bride.png" alt="Anushika" />` etc.
- **Events, banner photos, menu images, theme colours:** all editable in the app (admin → pencil on any card, or "Add event card").
- **Polls / trivia / games:** Play along tab → **New** (admin only).
- **App icon:** replace the files in `/public` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`).

## How it works (short version)

| Piece | Where |
|---|---|
| Database tables + permissions (Row Level Security) | `supabase/schema.sql` |
| Login (phone → hidden email, PIN → password) | `src/lib/phone.js`, `src/lib/auth.jsx` |
| Admin: add guests / reset PIN | `supabase/functions/admin-guests` |
| Stories circles, unseen first, auto-advance, swipe | `src/lib/stories.js`, `src/components/StoryViewer.jsx` |
| Photo/video upload (photos are compressed on the phone; videos ≤ 60 s) | `src/lib/upload.js` |
| Pages | `src/pages/*` |

## Things to know

- **PIN security:** a 4-digit PIN is convenient, not strong. Supabase rate-limits sign-in attempts, and only
  listed guests can log in, which is fine for a wedding. Guests' phone numbers are never visible to other guests
  (only admins can see them).
- **Media bucket is public-read** (files have unguessable URLs) so photos load fast. Only logged-in friends/admins can upload.
- **Videos:** iPhone `.mov` files play on iPhones and Macs but not always in Chrome on Android. If that becomes a problem,
  add server-side transcoding later (e.g. Cloudflare Stream or Mux).
- **Storage costs:** photos are resized to ~1600 px (typically 300–500 KB). Videos are stored as uploaded (≤ 100 MB each), so
  watch Storage usage in Supabase during the event.
- Test on a real phone before the wedding, with a few friends, using the sample CSV numbers.
