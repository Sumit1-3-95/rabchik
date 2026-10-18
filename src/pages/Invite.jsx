import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '../config'
import { toast } from '../lib/hooks'
import '../invite.css'

/* ---------------- content (from the invitation document) ---------------- */
const MEHNDI_VENUE = { name: 'Gulmohar Garden', where: 'Jaipur, Rajasthan', note: 'Mehndi celebrations · 9 December', tag: 'Let the festivities begin!', icon: '🌸', maps: 'https://www.google.com/maps/search/?api=1&query=Gulmohar+Garden+Jaipur' }
const MAIN_VENUE = { name: 'Riddhi Resort', where: 'Jaipur, Rajasthan', note: 'Main wedding venue · 10–11 December', tag: 'Two days, one very happy sky', icon: '🏰', maps: SITE.mapsUrl }

const EVENTS = [
  { id: 'mehndi', mark: '🌿', title: 'Mehndi', when: 'Dec 9', part: '', ymd: '20261209', next: '20261210', blurb: 'Henna, laughter, music and all things colourful.', venue: 'Gulmohar Garden', vibe: 'Come with clean hands. Leave with art.' },
  { id: 'lagan', mark: '🪔', title: 'Lagan Teeka', when: 'Dec 10', part: 'Morning', ymd: '20261210', next: '20261211', blurb: 'A beautiful morning of blessings and family traditions.', venue: 'Riddhi Resort', vibe: 'Arrive hungry for blessings (and breakfast).' },
  { id: 'sangeet', mark: '🪩', title: 'Sangeet', when: 'Dec 10', part: 'Night', ymd: '20261210', next: '20261211', blurb: 'Big beats, happy feet and dance-floor memories.', venue: 'Riddhi Resort', vibe: 'Warm up those knees. The playlist is dangerous.' },
  { id: 'haldi', mark: '🌼', title: 'Haldi', when: 'Dec 11', part: 'Morning', ymd: '20261211', next: '20261212', blurb: 'A sunny splash of turmeric, blessings and smiles.', venue: 'Riddhi Resort', vibe: 'Wear something you do not mind turning yellow.' },
  { id: 'reception', mark: '🥂', title: 'Reception', when: 'Dec 11', part: 'Night', ymd: '20261211', next: '20261212', blurb: 'Dress up, raise a toast and celebrate the newlyweds.', venue: 'Riddhi Resort', vibe: 'Your best outfit has been waiting for this.' },
  { id: 'pheras', mark: '🔥', title: 'Pheras', when: 'Dec 11', part: 'Midnight', ymd: '20261211', next: '20261212', blurb: 'As the night turns to midnight, we take our seven sacred steps together.', venue: 'Riddhi Resort', vibe: 'Seven steps, one midnight, zero dry eyes.' },
]

// 9 December 2026, 00:00 in India (IST = UTC+5:30)
const START = new Date('2026-12-08T18:30:00Z').getTime()
const END = new Date('2026-12-12T00:00:00+05:30').getTime()

const QUOTE = '“Webster’s Dictionary defines ‘wedding’ as the fusing of two metals with a hot torch. Well, you know something... I think you guys are two metals. Gold medals.”'

/* ---------------- helpers ---------------- */
const safeGet = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const safeSet = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }
const enc = encodeURIComponent
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function downloadAllDates() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const body = EVENTS.map((e) => [
    'BEGIN:VEVENT', `UID:${e.id}-2026@rabhchik`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${e.ymd}`, `DTEND;VALUE=DATE:${e.next}`,
    `SUMMARY:${e.title} · Saurabh & Anushika`, `LOCATION:${e.venue}\\, Jaipur`,
    `DESCRIPTION:${e.blurb}${e.part ? ` (${e.part})` : ''} ${SITE.hashtag}`, 'END:VEVENT',
  ].join('\r\n')).join('\r\n')
  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Rabhchik//Wedding//EN\r\n${body}\r\nEND:VCALENDAR`
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'saurabh-anushika-wedding.ics'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Flower petals drifting down the screen. */
function shower(n = 28) {
  if (reduceMotion()) return
  const colors = ['#f2a516', '#e07b00', '#d9b45a', '#c49a52', '#e9c987', '#fff1c9']
  const glyphs = ['✿', '❀', '✾', '❁']
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span')
    s.textContent = glyphs[i % glyphs.length]
    Object.assign(s.style, {
      position: 'fixed', left: `${Math.random() * 100}vw`, top: '-40px', zIndex: 120, pointerEvents: 'none',
      fontSize: `${16 + Math.random() * 18}px`, color: colors[i % colors.length], willChange: 'transform',
    })
    document.body.appendChild(s)
    const drift = (Math.random() - 0.5) * 160
    s.animate(
      [{ transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${drift}px, ${window.innerHeight + 80}px, 0) rotate(${(Math.random() - 0.5) * 720}deg)`, opacity: 0.9 }],
      { duration: 2400 + Math.random() * 2200, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.1,.6,1)' },
    ).onfinish = () => s.remove()
  }
  navigator.vibrate?.(20)
}

/** Champagne pop: a bottle, a fizz of gold bubbles and glints fanning up and falling back down. */
function champagne(el) {
  if (reduceMotion()) return
  const r = el.getBoundingClientRect()
  const ox = r.left + r.width / 2
  const oy = Math.min(window.innerHeight - 120, r.top + r.height * 0.72)
  const add = (node, style) => { Object.assign(node.style, { position: 'fixed', pointerEvents: 'none', zIndex: 120, willChange: 'transform, opacity', ...style }); document.body.appendChild(node); return node }

  const bottle = add(document.createElement('div'), { left: `${ox - 26}px`, top: `${oy - 30}px`, fontSize: '52px', lineHeight: 1 })
  bottle.textContent = '🍾'
  bottle.animate([
    { transform: 'translateY(40px) rotate(-30deg) scale(.4)', opacity: 0 },
    { transform: 'translateY(0) rotate(-24deg) scale(1.15)', opacity: 1, offset: 0.25 },
    { transform: 'translateY(-4px) rotate(-18deg) scale(1)', opacity: 1, offset: 0.7 },
    { transform: 'translateY(-30px) rotate(-14deg) scale(.9)', opacity: 0 },
  ], { duration: 1500, easing: 'ease-out' }).onfinish = () => bottle.remove()

  const foam = add(document.createElement('div'), { left: `${ox - 40}px`, top: `${oy - 40}px`, width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.95), rgba(255,241,201,.5) 55%, transparent 70%)' })
  foam.animate([{ transform: 'scale(.2)', opacity: 0.9 }, { transform: 'scale(2.6)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => foam.remove()

  const bits = ['#fff1c9', '#f3d9a0', '#e9c987', '#ffffff', '#f2a516']
  for (let i = 0; i < 46; i++) {
    const glint = i % 4 === 0
    const n = document.createElement('div')
    const size = glint ? 14 + Math.random() * 10 : 5 + Math.random() * 11
    if (glint) n.textContent = '✦'
    add(n, glint
      ? { left: `${ox}px`, top: `${oy}px`, fontSize: `${size}px`, color: bits[i % bits.length], lineHeight: 1 }
      : { left: `${ox}px`, top: `${oy}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #fff, rgba(255,241,201,.55))', boxShadow: `0 0 0 1px rgba(196,154,82,.7)` })
    const ang = (Math.random() - 0.5) * 2.1 // radians from straight up
    const power = 150 + Math.random() * 230
    const dx = Math.sin(ang) * power * 0.9
    const peak = -Math.cos(ang) * power
    const end = 90 + Math.random() * 260
    n.animate([
      { transform: 'translate(0,0) scale(.5)', opacity: 1, easing: 'cubic-bezier(.15,.7,.35,1)' },
      { transform: `translate(${dx * 0.65}px, ${peak}px) scale(1)`, opacity: 1, offset: 0.45, easing: 'cubic-bezier(.55,0,.9,.55)' },
      { transform: `translate(${dx}px, ${end}px) scale(.6) rotate(${(Math.random() - 0.5) * 360}deg)`, opacity: 0 },
    ], { duration: 1500 + Math.random() * 1300, delay: Math.random() * 180 }).onfinish = () => n.remove()
  }
  navigator.vibrate?.([30, 40, 70])
}

/* ---------------- small drawings ---------------- */
function Toran() {
  const N = 6, W = 40
  const swag = 'M0 4 ' + Array.from({ length: N }, (_, k) => `Q${k * W + W / 2} 19 ${(k + 1) * W} 4`).join(' ')
  return (
    <svg className="iv-toran" viewBox={`0 0 ${N * W} 70`} aria-hidden="true">
      <path d={swag} stroke="#8f6b1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d={swag} stroke="#c49a52" strokeWidth="0.9" fill="none" strokeLinecap="round" transform="translate(0 2)" />
      {Array.from({ length: N + 1 }, (_, k) => <circle key={`b${k}`} cx={k * W} cy="4" r="2.6" fill="#c49a52" />)}
      {Array.from({ length: N }, (_, k) => {
        const x = k * W + W / 2
        return (
          <g key={k}>
            <line x1={x} y1="11" x2={x} y2="19" stroke="#c49a52" strokeWidth="1.3" />
            <circle cx={x} cy="26" r="8.5" fill="#f2a516" />
            <circle cx={x} cy="26" r="5.4" fill="#e07b00" />
            <circle cx={x} cy="26" r="2.2" fill="#fff1c9" />
            <path d={`M${x - 7} 36 L${x + 7} 36 L${x} 60 Z`} fill="#8f6b1a" />
            <path d={`M${x - 3.6} 38 L${x + 3.6} 38 L${x} 53 Z`} fill="#d9b45a" />
            <circle cx={x} cy="63" r="2.4" fill="#c49a52" />
          </g>
        )
      })}
    </svg>
  )
}

function Corner({ cls }) {
  return (
    <svg className={`iv-corner ${cls}`} viewBox="0 0 60 60" aria-hidden="true">
      <g fill="none" strokeLinecap="round">
        <path d="M2 58 V14 Q2 2 14 2 H58" stroke="#8f6b1a" strokeWidth="1.8" />
        <path d="M9 52 V20 Q9 9 20 9 H52" stroke="#c49a52" strokeWidth="1.3" />
        <path d="M2 2 Q24 5 28 28 Q8 26 2 2Z" fill="rgba(143, 107, 26,.16)" stroke="#8f6b1a" strokeWidth="1" />
        <circle cx="33" cy="33" r="2.4" fill="#8f6b1a" />
        <circle cx="45" cy="14" r="1.6" fill="#c49a52" /><circle cx="14" cy="45" r="1.6" fill="#c49a52" />
      </g>
    </svg>
  )
}

function Divider() {
  return (
    <svg className="iv-div rv" viewBox="0 0 240 30" aria-hidden="true">
      <g fill="none" stroke="#c49a52" strokeWidth="1.4" strokeLinecap="round">
        <path d="M4 15 H92" /><path d="M148 15 H236" />
        <path d="M120 4 Q111 15 120 26 Q129 15 120 4Z" fill="rgba(143, 107, 26,.55)" />
        <path d="M120 26 Q103 24 99 12 Q112 12 120 26Z" fill="rgba(217, 180, 90,.55)" />
        <path d="M120 26 Q137 24 141 12 Q128 12 120 26Z" fill="rgba(217, 180, 90,.55)" />
        <circle cx="96" cy="15" r="2" fill="#c49a52" /><circle cx="144" cy="15" r="2" fill="#c49a52" />
      </g>
    </svg>
  )
}

function GMapsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <defs><clipPath id="gmpin"><path d="M12 1.5C7.9 1.5 4.6 4.8 4.6 8.9c0 5.4 7.4 13.6 7.4 13.6s7.4-8.2 7.4-13.6c0-4.1-3.3-7.4-7.4-7.4z" /></clipPath></defs>
      <g clipPath="url(#gmpin)">
        <rect x="0" y="0" width="24" height="24" fill="#EA4335" />
        <path d="M0 0 H12 L4 11 L0 11Z" fill="#4285F4" />
        <path d="M0 11 L4 11 L12 24 H0Z" fill="#34A853" />
        <path d="M24 9 L24 24 H12 L17 13Z" fill="#FBBC04" />
      </g>
      <circle cx="12" cy="8.9" r="2.9" fill="#fff" />
    </svg>
  )
}

function Medal({ onTap, delay }) {
  const [spin, setSpin] = useState(false)
  return (
    <button className={`iv-medal ${spin ? 'spin' : ''}`} style={{ animationDelay: delay }} aria-label="Gold medal. Tap to celebrate"
      onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 900); onTap() }}>
      <svg viewBox="0 0 80 100" aria-hidden="true">
        <path d="M22 0 L40 36 L58 0 Z" fill="#d9b45a" /><path d="M30 0 L40 20 L50 0 Z" fill="#8f6b1a" />
        <circle cx="40" cy="64" r="30" fill="#c49a52" /><circle cx="40" cy="64" r="30" fill="url(#gl)" />
        <circle cx="40" cy="64" r="23" fill="none" stroke="#fff1c9" strokeWidth="2" strokeDasharray="3 4" />
        <path d="M40 48 l5 11 12 1.5 -9 8 3 12 -11 -6.5 -11 6.5 3 -12 -9 -8 12 -1.5z" fill="#fff1c9" />
        <defs><radialGradient id="gl" cx="35%" cy="30%"><stop offset="0" stopColor="#fff6d6" stopOpacity=".9" /><stop offset=".6" stopColor="#c49a52" stopOpacity="0" /></radialGradient></defs>
      </svg>
    </button>
  )
}

/* ---------------- interactive bits ---------------- */
function Envelope({ onOpen }) {
  const [stage, setStage] = useState('closed') // closed -> opening -> gone
  const open = () => {
    if (stage !== 'closed') return
    setStage('opening')
    navigator.vibrate?.(15)
    setTimeout(() => setStage('gone'), 1700)
    setTimeout(onOpen, 2400)
  }
  return (
    <div className={`env ${stage}`} role="dialog" aria-label="Wedding invitation envelope">
      <div className="env-top">You have got mail<br /><b>from Saurabh &amp; Anushika</b></div>
      <div className="env-wrap">
        <div className="env-back" />
        <div className="env-letter"><div><span className="env-ganesh">॥ श्री गणेशाय नमः ॥</span><span className="env-nm">Saurabh <i>&amp;</i> Anushika</span><span className="env-dt">10–11 December · Jaipur</span></div></div>
        <div className="env-front" />
        <div className="env-flap" />
        <button className="env-seal" onClick={open} aria-label="Open the invitation"><span>S<i>♥</i>A</span></button>
      </div>
      <div className="env-hint">Tap the seal to open</div>
      <button className="env-skip" onClick={() => { setStage('gone'); setTimeout(onOpen, 300) }}>Skip</button>
    </div>
  )
}

function Countdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  if (now >= END) return <div className="iv-cd-done">Thank you for celebrating with us. {SITE.hashtag}</div>
  if (now >= START) return <div className="iv-cd-done">It is happening! The celebrations have begun.</div>
  let s = Math.floor((START - now) / 1000)
  const parts = [['days', Math.floor(s / 86400)], ['hours', Math.floor((s % 86400) / 3600)], ['mins', Math.floor((s % 3600) / 60)], ['secs', s % 60]]
  return (
    <div className="iv-cd" role="timer" aria-label="Countdown to the celebrations">
      <div className="iv-cd-label">The festivities begin in</div>
      <div className="iv-cd-row">
        {parts.map(([k, v]) => (
          <div className="iv-cd-box" key={k}>
            <b key={v}>{String(v).padStart(2, '0')}</b>
            <span>{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Timeline() {
  const [open, setOpen] = useState(null)
  return (
    <div className="iv-tl">
      {EVENTS.map((e, i) => {
        const on = open === e.id
        return (
          <article className={`iv-ev rv ${on ? 'on' : ''}`} key={e.id} style={{ '--d': `${(i % 3) * 0.08}s` }}>
            <div className="iv-mark" aria-hidden="true"><span>{e.mark}</span></div>
            <div className="iv-evc">
              <button className="iv-evb" aria-expanded={on} onClick={() => setOpen(on ? null : e.id)}>
                <div className="iv-evt">
                  <h3>{e.title}</h3>
                  <p>{e.blurb}</p>
                  {e.id === 'mehndi' && <p className="iv-evv"><b>Venue:</b> Gulmohar Garden</p>}
                </div>
                <div className="iv-date"><small>DEC</small><strong>{e.when.slice(4)}</strong>{e.part && <small>{e.part}</small>}</div>
              </button>
              <div className="iv-more"><div>
                <p className="iv-vibe">{e.vibe}</p>
              </div></div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function Pass() {
  const [name, setName] = useState(() => safeGet('rabchik.guestname') || '')
  const [torn, setTorn] = useState(false)
  const shown = (name.trim() || 'Our favourite guest').toUpperCase()
  const tear = () => {
    if (torn) return
    setTorn(true)
    navigator.vibrate?.([20, 30, 20])
    shower(18)
  }
  return (
    <div className="iv-passwrap">
      <label className="iv-pl" htmlFor="pass-name">Your name, for your wedding pass</label>
      <input id="pass-name" className="iv-input" value={name} maxLength={22} placeholder="Type your name"
        onChange={(e) => { setName(e.target.value); safeSet('rabchik.guestname', e.target.value) }} />
      <div className={`iv-pass ${torn ? 'torn' : ''}`}>
        <div className="iv-pmain">
          <div className="iv-ptop"><b>JAIPUR EXPRESS</b><span>WEDDING PASS</span></div>
          <div className="iv-pname">{shown}</div>
          <div className="iv-pgrid">
            <div><small>FROM</small><b>Wherever you are</b></div>
            <div><small>TO</small><b>JAI · Jaipur</b></div>
            <div><small>DATES</small><b>09–11 DEC</b></div>
            <div><small>GATE</small><b>Riddhi Resort</b></div>
            <div><small>SEAT</small><b>Dance floor, 1A</b></div>
            <div><small>BAGS</small><b>Love only</b></div>
          </div>
        </div>
        <button className="iv-stub" onClick={tear} aria-label="Tear the stub" disabled={torn}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.5 8l11 9M8.5 16l11-9" /></g></svg>
          <span className="iv-bars" aria-hidden="true" />
          <em>Tap to tear</em>
        </button>
      </div>
      <div className={`iv-stamp ${torn ? 'show' : ''}`}>
        <p>Pass stamped. Boarding begins on 9 December.</p>
        <button className="iv-btn" onClick={() => { downloadAllDates(); toast('Dates saved. Open the file to add them') }}>Save all dates to my calendar</button>
      </div>
    </div>
  )
}

function DanceMeter() {
  const [v, setV] = useState(60)
  const say = v < 25 ? 'Mostly here for the food.' : v < 50 ? 'Will dance after two plates.' : v < 75 ? 'Bollywood ready.' : v < 95 ? 'First on the floor, last to leave.' : 'Table-top legend. We see you.'
  return (
    <div className="iv-meter">
      <label htmlFor="dance" className="iv-pl">How ready are your dance moves?</label>
      <input id="dance" type="range" min="0" max="100" value={v} onChange={(e) => setV(+e.target.value)} style={{ '--v': `${v}%` }} />
      <div className="iv-say" aria-live="polite" key={say}>{say}</div>
    </div>
  )
}

async function shareInvite() {
  const data = { title: 'Saurabh & Anushika’s wedding', text: `You are invited! 10–11 December, Jaipur. ${SITE.hashtag}`, url: window.location.origin }
  try {
    if (navigator.share) await navigator.share(data)
    else { await navigator.clipboard.writeText(data.url); toast('Link copied') }
  } catch { /* cancelled */ }
}

/* ---------------- page ---------------- */
export default function Invite() {
  const root = useRef(null)
  const bar = useRef(null)
  const [opened, setOpened] = useState(() => safeGet('rabchik.invite.opened') === '1' || reduceMotion())
  const arch = useRef(null)
  const [hold, setHold] = useState(false)
  const timers = useRef({})
  const from = useRef(null)
  const pressEnd = () => { clearTimeout(timers.current.a); clearTimeout(timers.current.b); setHold(false); from.current = null }
  const pressStart = (e) => {
    pressEnd()
    from.current = { x: e.clientX, y: e.clientY }
    timers.current.a = setTimeout(() => setHold(true), 320)
    timers.current.b = setTimeout(() => { setHold(false); from.current = null; champagne(arch.current) }, 750)
  }
  const pressMove = (e) => {
    if (from.current && Math.hypot(e.clientX - from.current.x, e.clientY - from.current.y) > 14) pressEnd()
  }
  useEffect(() => () => { clearTimeout(timers.current.a); clearTimeout(timers.current.b) }, [])

  // scroll-in animation + progress bar
  useEffect(() => {
    const el = root.current
    el.classList.add('js')
    const items = el.querySelectorAll('.rv')
    let io
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.dataset.in = '1'; io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' })
      items.forEach((i) => io.observe(i))
    } else items.forEach((i) => { i.dataset.in = '1' })
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight
        if (bar.current) bar.current.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { io?.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('env-lock', !opened)
    return () => document.body.classList.remove('env-lock')
  }, [opened])

  const finishOpen = () => { safeSet('rabchik.invite.opened', '1'); setOpened(true); setTimeout(() => shower(22), 200) }

  return (
    <main className="iv" ref={root}>
      {!opened && <Envelope onOpen={finishOpen} />}
      <div className="iv-progress" aria-hidden="true"><i ref={bar} /></div>

      <article className="iv-card">
        <Toran />
        <Corner cls="tl" /><Corner cls="tr" /><Corner cls="bl" /><Corner cls="br" />

        <section className="iv-hero">
          <div className="iv-ganesh rv">॥ श्री गणेशाय नमः ॥</div>
          <div className="iv-eyebrow rv">A little invite, a lot of love</div>
          <div ref={arch} className={`iv-arch rv ${hold ? 'hold' : ''}`} role="img" aria-label="Saurabh and Anushika"
            onPointerDown={pressStart} onPointerUp={pressEnd} onPointerCancel={pressEnd} onPointerLeave={pressEnd} onPointerMove={pressMove}
            onContextMenu={(e) => e.preventDefault()}>
            <span className="iv-sun" aria-hidden="true" />
            <img src="/couple.webp" alt="" width="560" height="830" draggable="false" />
          </div>
          <h1 className="iv-names rv">Saurabh <span>&amp;</span> Anushika</h1>
          <p className="iv-intro rv">Two hearts, one forever, and our favourite people to celebrate it with. We’d love for you to be part of our wedding festivities in Jaipur.</p>
          <div className="iv-pill rv">✦ &nbsp;10–11 DECEMBER&nbsp; ✦</div>
          <p className="iv-note rv">Save the dates · Bring your dancing shoes · Come ready for happy tears</p>
          <Countdown />
        </section>

        <Divider />

        <section className="iv-sec" id="venue">
          <header className="iv-head rv">
            <div className="iv-eyebrow gold">Your wedding-weekend guide</div>
            <h2>Meet us in Jaipur</h2>
            <p>Our celebrations, all under one very happy sky.</p>
          </header>
          <div className="iv-venues">
            {[MAIN_VENUE, MEHNDI_VENUE].map((v, i) => (
              <div key={v.name} className="iv-venue rv" style={{ '--d': `${i * 0.1}s` }}>
                <span className="iv-vi" aria-hidden="true">{v.icon}</span>
                <h3>{v.name}</h3>
                <p>{v.where}</p>
                <small>{v.note}</small>
                <a className="iv-map" href={v.maps} target="_blank" rel="noreferrer" aria-label={`Open ${v.name} in Google Maps`}>
                  <GMapsIcon /><span>Open in Google Maps</span>
                </a>
                {v === MAIN_VENUE && <Link className="iv-plan" to="/map">See the resort floor plan</Link>}
              </div>
            ))}
          </div>
        </section>

        <Divider />

        <section className="iv-sec" id="celebrations">
          <header className="iv-head rv">
            <div className="iv-eyebrow gold">The wedding itinerary</div>
            <h2>One shaadi, many memories</h2>
            <p>From mehndi moments to midnight pheras, here’s the plan. Tap any event to open it.</p>
          </header>
          <Timeline />
          <div className="iv-bring rv">
            <strong>All you need to bring is your love 💌</strong>
            <div>We’ll take care of the memories. You bring the blessings, the hugs and your best moves.</div>
          </div>
        </section>

        <Divider />

        <section className="iv-sec">
          <header className="iv-head rv">
            <div className="iv-eyebrow gold">Your boarding pass</div>
            <h2>Reserve your seat</h2>
            <p>Add your name, then tear the stub.</p>
          </header>
          <div className="rv"><Pass /></div>
          <div className="rv"><DanceMeter /></div>
        </section>

        <Divider />

        <section className="iv-sec iv-office">
          <header className="iv-head rv">
            <div className="iv-eyebrow gold">A word from the office</div>
          </header>
          <blockquote className="iv-quote rv">
            <p>{QUOTE}</p>
            <footer>— Michael Scott, <cite>The Office</cite></footer>
          </blockquote>
          <div className="iv-medals rv" aria-label="Two gold medals">
            <Medal onTap={() => shower(14)} delay="0s" /><Medal onTap={() => shower(14)} delay=".4s" />
          </div>
          <div className="iv-tap">Tap the medals. You earned them.</div>
        </section>

        <footer className="iv-foot rv">
          <div className="iv-heart" aria-hidden="true">✿ ♥ ✿</div>
          <div className="iv-fnames">Saurabh &amp; Anushika</div>
          <p>Can’t wait to celebrate with you.</p>
          <div className="iv-actions">
            <button className="iv-btn" onClick={shareInvite}>Share this invite</button>
            <Link className="iv-btn ghost" to="/events">See all events</Link>
            <a className="iv-btn ghost" href={SITE.instagramUrl} target="_blank" rel="noreferrer">{SITE.hashtag} on Instagram</a>
          </div>
          <small>Made with love · Jaipur · December</small>
        </footer>
      </article>
    </main>
  )
}