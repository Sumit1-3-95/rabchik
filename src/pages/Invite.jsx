import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '../config'
import { toast } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { startMusic, stopMusic, toggleMusic, useMusic } from '../lib/music'
import '../invite.css'

/* ---------------- content (from the invitation document) ---------------- */
const MAIN_VENUE = { name: 'Riddhi Resort', where: 'Jaipur, Rajasthan', note: 'Wedding venue · 10–11 December', tag: 'Two days, one very happy sky', icon: '🏰', maps: SITE.mapsUrl }

const EVENTS = [
  { id: 'lagan', mark: '🪔', title: 'Lagan Teeka', when: 'Dec 10', part: 'Morning', ymd: '20261210', next: '20261211', blurb: 'A beautiful morning of blessings and family traditions.', venue: 'Riddhi Resort', vibe: 'Arrive hungry for blessings (and breakfast).' },
  { id: 'sangeet', mark: '🪩', title: 'Sangeet', when: 'Dec 10', part: 'Night', ymd: '20261210', next: '20261211', blurb: 'Big beats, happy feet and dance-floor memories.', venue: 'Riddhi Resort', vibe: 'Warm up those knees. The playlist is dangerous.' },
  { id: 'haldi', mark: '🌼', title: 'Haldi', when: 'Dec 11', part: 'Morning', ymd: '20261211', next: '20261212', blurb: 'A sunny splash of turmeric, blessings and smiles.', venue: 'Riddhi Resort', vibe: 'Wear something you do not mind turning yellow.' },
  { id: 'reception', mark: '🥂', title: 'Reception', when: 'Dec 11', part: 'Night', ymd: '20261211', next: '20261212', blurb: 'Dress up, raise a toast and celebrate the newlyweds.', venue: 'Riddhi Resort', vibe: 'Your best outfit has been waiting for this.' },
  { id: 'pheras', mark: '🔥', title: 'Pheras', when: 'Dec 11', part: 'Midnight', ymd: '20261211', next: '20261212', blurb: 'As the night turns to midnight, we take our seven sacred steps together.', venue: 'Riddhi Resort', vibe: 'Seven steps, one midnight, zero dry eyes.' },
]

// 10 December 2026, 00:00 in India (IST = UTC+5:30)
const START = new Date('2026-12-09T18:30:00Z').getTime()
const END = new Date('2026-12-12T00:00:00+05:30').getTime()

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
  const colors = ['#f2a516', '#e07b00', '#c96d7c', '#c49a52', '#e8556d', '#fff1c9']
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

/** Soap bubbles from the bubble gun: shiny, wobbly, drifting up and popping. */
function bubbles(el) {
  if (reduceMotion()) return
  const r = el.getBoundingClientRect()
  const ox = r.left + r.width / 2, oy = r.top + r.height / 2
  for (let i = 0; i < 18; i++) {
    const size = 14 + Math.random() * 34
    const b = document.createElement('div')
    Object.assign(b.style, {
      position: 'fixed', left: `${ox - size / 2}px`, top: `${oy - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      zIndex: 120, pointerEvents: 'none', willChange: 'transform, opacity',
      background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,.95) 0 9%, rgba(255,255,255,0) 22%), radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 58%, rgba(201,109,124,.22) 72%, rgba(242,165,22,.28) 84%, rgba(47,128,237,.3) 100%)',
      boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.75), 0 0 8px rgba(255,255,255,.6)',
    })
    document.body.appendChild(b)
    const dx = (Math.random() - 0.35) * 220, rise = 140 + Math.random() * 300, sway = (Math.random() - 0.5) * 70
    b.animate([
      { transform: 'translate(0,0) scale(.2)', opacity: 0 },
      { transform: `translate(${dx * 0.3}px, ${-rise * 0.25}px) scale(1)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${dx * 0.6 + sway}px, ${-rise * 0.6}px) scale(1.02)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx * 0.85 - sway}px, ${-rise * 0.92}px) scale(1.08)`, opacity: 0.95, offset: 0.9 },
      { transform: `translate(${dx}px, ${-rise}px) scale(1.4)`, opacity: 0 },
    ], { duration: 2200 + Math.random() * 1800, delay: Math.random() * 600, easing: 'ease-out' }).onfinish = () => b.remove()
  }
  navigator.vibrate?.(15)
}

/** Holi: clouds of coloured gulal bursting across the screen. */
function holi() {
  if (reduceMotion()) return
  const cols = ['#e6007e', '#ff7a00', '#ffd400', '#1fb26b', '#2f80ed', '#8e44ad']
  const w = window.innerWidth, h = window.innerHeight
  const add = (style) => { const n = document.createElement('div'); Object.assign(n.style, { position: 'fixed', pointerEvents: 'none', zIndex: 120, willChange: 'transform, opacity', ...style }); document.body.appendChild(n); return n }
  for (let b = 0; b < 7; b++) {
    const x = w * (0.12 + Math.random() * 0.76), y = h * (0.15 + Math.random() * 0.6), c = cols[b % cols.length]
    const delay = b * 110
    const size = 150 + Math.random() * 120
    const cloud = add({ left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: `radial-gradient(circle, ${c}cc, ${c}55 55%, transparent 72%)`, filter: 'blur(5px)' })
    cloud.animate([{ transform: 'scale(.15)', opacity: 0.95 }, { transform: 'scale(1.5)', opacity: 0.7, offset: 0.45 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 1700, delay, easing: 'ease-out', fill: 'backwards' }).onfinish = () => cloud.remove()
    for (let i = 0; i < 14; i++) {
      const d = 3 + Math.random() * 6
      const dot = add({ left: `${x}px`, top: `${y}px`, width: `${d}px`, height: `${d}px`, borderRadius: '50%', background: c })
      const ang = Math.random() * Math.PI * 2, r = 70 + Math.random() * 150
      dot.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r + 40}px)`, opacity: 0 }], { duration: 1100 + Math.random() * 700, delay, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'backwards' }).onfinish = () => dot.remove()
    }
  }
  navigator.vibrate?.([20, 30, 20])
}

/** A few hearts floating up from the photo. */
function hearts(el) {
  if (reduceMotion()) return
  const r = el.getBoundingClientRect()
  const cols = ['#7b263a', '#c96d7c', '#e8556d', '#f2a516']
  for (let i = 0; i < 9; i++) {
    const h = document.createElement('span')
    h.textContent = i % 3 === 0 ? '✦' : '♥'
    Object.assign(h.style, { position: 'fixed', left: `${r.left + r.width * (0.2 + Math.random() * 0.6)}px`, top: `${r.top + r.height * (0.45 + Math.random() * 0.4)}px`, zIndex: 120, pointerEvents: 'none', fontSize: `${14 + Math.random() * 14}px`, color: cols[i % cols.length], willChange: 'transform, opacity' })
    document.body.appendChild(h)
    h.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0 }, { transform: `translate(${(Math.random() - 0.5) * 50}px, -40px) scale(1)`, opacity: 1, offset: 0.25 }, { transform: `translate(${(Math.random() - 0.5) * 90}px, -${120 + Math.random() * 90}px) scale(.8)`, opacity: 0 }], { duration: 1300 + Math.random() * 700, delay: Math.random() * 250, easing: 'ease-out' }).onfinish = () => h.remove()
  }
}

/** Firecrackers: bursts of sparks that fly out, then fall like embers. */
function crackers() {
  if (reduceMotion()) return
  const w = window.innerWidth, h = window.innerHeight
  const cols = ['#f2a516', '#ffd400', '#ff5a36', '#e6007e', '#ffffff', '#c96d7c']
  const add = (style) => { const n = document.createElement('div'); Object.assign(n.style, { position: 'fixed', pointerEvents: 'none', zIndex: 120, willChange: 'transform, opacity', ...style }); document.body.appendChild(n); return n }
  for (let b = 0; b < 6; b++) {
    const x = w * (0.15 + Math.random() * 0.7), y = h * (0.12 + Math.random() * 0.38), delay = b * 260 + Math.random() * 120
    const base = cols[b % cols.length]
    const flash = add({ left: `${x - 30}px`, top: `${y - 30}px`, width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, #fff, rgba(255,214,120,.7) 40%, transparent 70%)' })
    flash.animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(2.2)', opacity: 0 }], { duration: 420, delay, easing: 'ease-out', fill: 'backwards' }).onfinish = () => flash.remove()
    const N = 26
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + Math.random() * 0.2, r = 70 + Math.random() * 70
      const c = i % 5 === 0 ? '#ffffff' : base
      const sp = add({ left: `${x}px`, top: `${y}px`, width: '4px', height: '4px', borderRadius: '50%', background: c, boxShadow: `0 0 6px 2px ${c}` })
      const dx = Math.cos(ang) * r, dy = Math.sin(ang) * r
      sp.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1, offset: 0.55, easing: 'ease-in' }, { transform: `translate(${dx * 1.1}px, ${dy + 90}px) scale(.3)`, opacity: 0 }], { duration: 1300 + Math.random() * 400, delay, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'backwards' }).onfinish = () => sp.remove()
    }
  }
  navigator.vibrate?.([30, 50, 30, 50, 60])
}

/* ---------------- small drawings ---------------- */
function Toran() {
  const N = 6, W = 40
  const swag = 'M0 4 ' + Array.from({ length: N }, (_, k) => `Q${k * W + W / 2} 19 ${(k + 1) * W} 4`).join(' ')
  return (
    <svg className="iv-toran" viewBox={`0 0 ${N * W} 70`} aria-hidden="true">
      <path d={swag} stroke="#7b263a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
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
            <path d={`M${x - 7} 36 L${x + 7} 36 L${x} 60 Z`} fill="#7b263a" />
            <path d={`M${x - 3.6} 38 L${x + 3.6} 38 L${x} 53 Z`} fill="#c96d7c" />
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
        <path d="M2 58 V14 Q2 2 14 2 H58" stroke="#7b263a" strokeWidth="1.8" />
        <path d="M9 52 V20 Q9 9 20 9 H52" stroke="#c49a52" strokeWidth="1.3" />
        <path d="M2 2 Q24 5 28 28 Q8 26 2 2Z" fill="rgba(123, 38, 58,.16)" stroke="#7b263a" strokeWidth="1" />
        <circle cx="33" cy="33" r="2.4" fill="#7b263a" />
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
        <path d="M120 4 Q111 15 120 26 Q129 15 120 4Z" fill="rgba(123, 38, 58,.55)" />
        <path d="M120 26 Q103 24 99 12 Q112 12 120 26Z" fill="rgba(201, 109, 124,.55)" />
        <path d="M120 26 Q137 24 141 12 Q128 12 120 26Z" fill="rgba(201, 109, 124,.55)" />
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

function Celebrate() {
  const playing = useMusic()
  const toggleTune = () => toggleMusic()
  return (
    <div className="iv-fx rv" role="group" aria-label="Celebrate">
      <button type="button" className="iv-fxb" aria-label="Flower shower" title="Flower shower" onClick={() => shower(26)}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <g fill="#c96d7c" stroke="#7b263a" strokeWidth="1.1">{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="16" cy="8.5" rx="4.2" ry="6" transform={`rotate(${a} 16 16)`} />)}</g>
          <circle cx="16" cy="16" r="3.6" fill="#f2a516" stroke="#7b263a" strokeWidth="1.1" />
        </svg>
      </button>
      <button type="button" className="iv-fxb" aria-label="Holi colours" title="Holi colours" onClick={holi}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="11" cy="12" r="7" fill="#e6007e" opacity=".85" /><circle cx="21" cy="11" r="6.5" fill="#ffd400" opacity=".85" />
          <circle cx="16" cy="21" r="7" fill="#2f80ed" opacity=".8" /><circle cx="25" cy="22" r="3.2" fill="#1fb26b" /><circle cx="6" cy="24" r="2.6" fill="#ff7a00" />
        </svg>
      </button>
      <button type="button" className="iv-fxb" aria-label="Bubble gun" title="Bubble gun" onClick={(e) => bubbles(e.currentTarget)}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M5 14h14l3 3v4h-6l-1 7h-5l1-7H5z" fill="#7b263a" />
          <rect x="7" y="16" width="9" height="2" rx="1" fill="#c96d7c" />
          <circle cx="24.5" cy="11" r="4.2" fill="none" stroke="#c49a52" strokeWidth="1.8" />
          <path d="M21.5 14l-2 2.5" stroke="#c49a52" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="27.5" cy="5" r="2.2" fill="none" stroke="#7b263a" strokeWidth="1.1" /><circle cx="22" cy="5.5" r="1.4" fill="none" stroke="#7b263a" strokeWidth="1" /><circle cx="29" cy="14" r="1.2" fill="none" stroke="#7b263a" strokeWidth="1" />
        </svg>
      </button>
      <button type="button" className="iv-fxb" aria-label="Firecrackers" title="Firecrackers" onClick={crackers}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <g stroke="#f2a516" strokeWidth="2" strokeLinecap="round">{Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return <line key={k} x1={16 + Math.cos(a) * 5} y1={16 + Math.sin(a) * 5} x2={16 + Math.cos(a) * 12} y2={16 + Math.sin(a) * 12} stroke={k % 2 ? '#c96d7c' : '#f2a516'} /> })}</g>
          <circle cx="16" cy="16" r="3.2" fill="#7b263a" />
          <circle cx="4.5" cy="5" r="1.2" fill="#f2a516" /><circle cx="27.5" cy="27" r="1.2" fill="#c96d7c" />
        </svg>
      </button>
      <button type="button" className={`iv-fxb ${playing ? 'playing' : ''}`} aria-label={playing ? 'Stop the wedding music' : 'Play wedding music'} aria-pressed={playing} title="Wedding music" onClick={toggleTune}>
        {playing ? (
          <svg viewBox="0 0 32 32" aria-hidden="true"><g fill="#7b263a">{[7, 13, 19].map((x, k) => <rect key={x} className="eq" style={{ animationDelay: `${k * 0.15}s` }} x={x} y="8" width="4.5" height="16" rx="2" />)}</g></svg>
        ) : (
          <svg viewBox="0 0 32 32" aria-hidden="true"><g fill="#7b263a"><path d="M13 22V8.5l11-2.5v13" fill="none" stroke="#7b263a" strokeWidth="2" strokeLinejoin="round" /><ellipse cx="10.2" cy="22.5" rx="3.6" ry="2.8" /><ellipse cx="21.2" cy="19.8" rx="3.6" ry="2.8" /></g></svg>
        )}
      </button>
    </div>
  )
}

/* ---------------- interactive bits ---------------- */
function Envelope({ onOpen }) {
  const [stage, setStage] = useState('closed') // closed -> opening -> gone
  const open = () => {
    if (stage !== 'closed') return
    setStage('opening')
    startMusic()
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
          <article className={`iv-ev rv ${on ? 'on' : ''}`} key={e.id} style={{ '--d': `${(i % 2) * 0.06}s`, '--x': i % 2 ? '46px' : '-46px' }}>
            <div className="iv-mark" aria-hidden="true"><span>{e.mark}</span></div>
            <div className="iv-evc">
              <button className="iv-evb" aria-expanded={on} onClick={() => setOpen(on ? null : e.id)}>
                <div className="iv-evt">
                  <h3>{e.title}</h3>
                  <p>{e.blurb}</p>
                                  </div>
                <div className="iv-date"><small>DEC</small><strong>{e.when.slice(4)}</strong>{e.part && <small>{e.part}</small>}</div>
                <span className="iv-chev" aria-hidden="true">▾</span>
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
  const saved = (() => { try { return JSON.parse(safeGet('rabchik.rsvp') || 'null') } catch { return null } })()
  const [name, setName] = useState(() => saved?.name || '')
  const [guests, setGuests] = useState(saved?.guests ?? 0)
  const [rsvpId, setRsvpId] = useState(saved?.id || null)
  const [torn, setTorn] = useState(!!saved)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const input = useRef(null)
  const shown = (name.trim() || 'Our favourite guest').toUpperCase()
  const first = name.trim().split(/\s+/)[0]
  const who = guests === 0 ? 'Just you' : `You + ${guests}`

  const submit = async () => {
    if (busy || torn) return
    if (!name.trim()) {
      setShake(true); setTimeout(() => setShake(false), 600)
      input.current?.focus()
      return toast('Add your name first')
    }
    setBusy(true)
    const { data, error } = await supabase.rpc('rsvp_save', { p_id: rsvpId, p_name: name.trim(), p_guests: guests })
    setBusy(false)
    if (error) return toast('Could not save your RSVP. Please try again')
    setRsvpId(data)
    safeSet('rabchik.rsvp', JSON.stringify({ id: data, name: name.trim(), guests }))
    setTorn(true)
    navigator.vibrate?.([20, 30, 20])
    shower(22)
  }

  return (
    <div className="iv-passwrap">
      <label className="iv-pl" htmlFor="pass-name">Your name</label>
      <input id="pass-name" ref={input} className={`iv-input ${shake ? 'shake' : ''}`} value={name} maxLength={40} placeholder="Type your name" autoComplete="name"
        onChange={(e) => setName(e.target.value)} disabled={torn} />

      <div className="iv-pl" id="gl">Who is coming with you?</div>
      <div className="iv-step" role="group" aria-labelledby="gl">
        <button type="button" aria-label="One fewer guest" disabled={torn || guests === 0} onClick={() => setGuests((g) => Math.max(0, g - 1))}>−</button>
        <div aria-live="polite"><b>{guests === 0 ? 'Just me' : `+${guests}`}</b><small>{guests === 0 ? 'No plus one' : guests === 1 ? 'guest with me' : 'guests with me'}</small></div>
        <button type="button" aria-label="One more guest" disabled={torn || guests === 8} onClick={() => setGuests((g) => Math.min(8, g + 1))}>+</button>
      </div>

      <div className={`iv-pass ${torn ? 'torn' : ''}`}>
        <div className="iv-pmain">
          <div className="iv-ptop"><b>JAIPUR EXPRESS</b><span>WEDDING PASS</span></div>
          <div className="iv-pname">{shown}</div>
          <div className="iv-pgrid">
            <div><small>FROM</small><b>Wherever you are</b></div>
            <div><small>TO</small><b>JAI · Jaipur</b></div>
            <div><small>DATES</small><b>10–11 DEC</b></div>
            <div><small>GATE</small><b>Riddhi Resort</b></div>
            <div><small>PASSENGERS</small><b>{who}</b></div>
            <div><small>BAGS</small><b>Love only</b></div>
          </div>
        </div>
        <button type="button" className="iv-stub" onClick={submit} aria-label="Tear the stub to confirm your RSVP" disabled={torn}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.5 8l11 9M8.5 16l11-9" /></g></svg>
          <span className="iv-bars" aria-hidden="true" />
          <em>Tear to RSVP</em>
        </button>
      </div>

      {!torn && (
        <button type="button" className="iv-rsvp" onClick={submit} disabled={busy}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.5 8l11 9M8.5 16l11-9" /></g></svg>
          {busy ? 'Saving your seat…' : 'Tear the stub & RSVP'}
        </button>
      )}

      <div className={`iv-stamp ${torn ? 'show' : ''}`}>
        <p>{first ? `${first}, you are on the list!` : 'You are on the list!'}<br />Boarding begins on 10 December.</p>
        <button type="button" className="iv-btn" onClick={() => { downloadAllDates(); toast('Dates saved. Open the file to add them') }}>Save all dates to my calendar</button>
        <button type="button" className="iv-link" onClick={() => setTorn(false)}>Change my RSVP</button>
      </div>
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
  const motionAsked = useRef(false)
  const from = useRef(null)
  const pressEnd = () => { clearTimeout(timers.current.a); clearTimeout(timers.current.b); setHold(false); from.current = null }
  const shakePhoto = () => {
    const el = arch.current
    if (!el) return
    el.classList.remove('shk'); void el.offsetWidth; el.classList.add('shk')
    setTimeout(() => el.classList.remove('shk'), 800)
    hearts(el)
    navigator.vibrate?.(25)
  }
  const pressUp = () => {
    // a quick tap (not a long press, not a drag) makes the couple shake with delight
    const quick = from.current && Date.now() - from.current.at < 320
    pressEnd()
    if (quick) shakePhoto()
  }
  const pressStart = (e) => {
    pressEnd()
    from.current = { x: e.clientX, y: e.clientY, at: Date.now() }
    // iPhones ask permission before sharing motion: do it on this first tap
    try { if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission && !motionAsked.current) { motionAsked.current = true; DeviceMotionEvent.requestPermission().catch(() => {}) } } catch { /* ignore */ }
    timers.current.a = setTimeout(() => setHold(true), 320)
    timers.current.b = setTimeout(() => { setHold(false); from.current = null; champagne(arch.current) }, 750)
  }
  const pressMove = (e) => {
    if (from.current && Math.hypot(e.clientX - from.current.x, e.clientY - from.current.y) > 14) pressEnd()
  }
  useEffect(() => () => { clearTimeout(timers.current.a); clearTimeout(timers.current.b) }, [])

  // shaking the phone shakes the photo too
  useEffect(() => {
    let last = 0
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0)
      const now = Date.now()
      if (mag > 38 && now - last > 1800) { last = now; shakePhoto(); shower(8) }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopMusic(), [])

  // the envelope button in the header brings the closed envelope back
  useEffect(() => {
    const again = () => { stopMusic(); try { localStorage.removeItem('rabchik.invite.opened') } catch { /* private mode */ } window.scrollTo(0, 0); setOpened(false) }
    window.addEventListener('rabchik:envelope', again)
    return () => window.removeEventListener('rabchik:envelope', again)
  }, [])

  // scroll-in animation + progress bar
  useEffect(() => {
    const el = root.current
    el.classList.add('js')
    const items = el.querySelectorAll('.rv')
    let io
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.dataset.in = '1'; io.unobserve(e.target) } }), { threshold: 0, rootMargin: '0px 0px 140px 0px' })
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
            onPointerDown={pressStart} onPointerUp={pressUp} onPointerCancel={pressEnd} onPointerLeave={pressEnd} onPointerMove={pressMove}
            onContextMenu={(e) => e.preventDefault()}>
            <img src="/couple.webp" alt="" width="560" height="830" draggable="false" />
          </div>
          <Celebrate />
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
            {[MAIN_VENUE].map((v, i) => (
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
            <p>From blessings in the morning to midnight pheras, here’s the plan. Tap any event to open it.</p>
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
            <div className="iv-eyebrow gold">RSVP</div>
            <h2>Reserve your seat</h2>
            <p>Tell us who is coming, then tear the stub on your boarding pass.</p>
          </header>
          <div className="rv"><Pass /></div>
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