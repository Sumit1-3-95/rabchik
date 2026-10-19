import { useEffect, useState } from 'react'
import { SITE } from '../config'

/*
 * Wedding music for the Invite page.
 * - If SITE.musicUrl is set (an mp3 you added to /public, e.g. '/wedding-music.mp3'), that track plays.
 * - Otherwise a short Indian wedding instrumental is made right in the browser:
 *   a tanpura drone, a shehnai-style lead in raag Bhairav, and a keherwa tabla cycle.
 * Always start it from a tap (phones block sound otherwise).
 */

const BEAT = 0.55
const CYCLE = ['D', 'g', 'n', 't', 'n', 'k', 'D', 'n'] // keherwa: dha ge na ti na ka dha na
// raag Bhairav, semitones above middle C: S r G m P d N S' r' G'
const MELODY = [
  [4, 1], [5, 0.5], [7, 0.5], [8, 1], [7, 1], [5, 0.5], [4, 0.5], [1, 1], [0, 2],
  [7, 1], [8, 0.5], [11, 0.5], [12, 1.5], [11, 0.5], [8, 1], [7, 1], [5, 0.5], [4, 0.5], [1, 1],
  [12, 1], [13, 0.5], [12, 0.5], [11, 1], [8, 1], [11, 0.5], [12, 0.5], [13, 1], [16, 1], [13, 1],
  [12, 1], [11, 0.5], [8, 0.5], [7, 1], [5, 0.5], [4, 0.5], [1, 1], [0, 3],
]
const INTRO_BEATS = 8
const hz = (m) => 261.63 * Math.pow(2, m / 12)

function makeReverb(ctx) {
  const len = Math.floor(ctx.sampleRate * 1.8)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
  }
  const conv = ctx.createConvolver(); conv.buffer = buf
  return conv
}

/** Schedules the whole piece on an AudioContext. Returns its length in seconds. */
export function scheduleWeddingMusic(ctx, t0 = ctx.currentTime + 0.08) {
  const melodyBeats = MELODY.reduce((n, [, d]) => n + d, 0)
  const total = (INTRO_BEATS + melodyBeats + 3) * BEAT
  const end = t0 + total

  const master = ctx.createGain(); master.gain.value = 1.1
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4
  master.connect(comp); comp.connect(ctx.destination)
  const rev = makeReverb(ctx), wet = ctx.createGain(); wet.gain.value = 0.28
  rev.connect(wet); wet.connect(master)
  const bus = ctx.createGain(); bus.connect(master); bus.connect(rev)

  // fade in and out
  master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(1.1, t0 + 0.5)
  master.gain.setValueAtTime(1.1, end - 1.6); master.gain.linearRampToValueAtTime(0, end)

  // tanpura: Pa, Sa, Sa, low Sa, plucked over and over
  const pluck = (f, at) => {
    for (const [mult, g] of [[1, 0.07], [2, 0.04], [3, 0.025]]) {
      const o = ctx.createOscillator(), gg = ctx.createGain()
      o.type = 'triangle'; o.frequency.value = f * mult
      gg.gain.setValueAtTime(0, at); gg.gain.linearRampToValueAtTime(g, at + 0.02); gg.gain.exponentialRampToValueAtTime(0.0008, at + 2.2)
      o.connect(gg); gg.connect(bus); o.start(at); o.stop(at + 2.3)
    }
  }
  const tanpura = [196, 261.63, 261.63, 130.81]
  for (let k = 0, at = t0; at < end - 1; k++, at += BEAT * 1.5) pluck(tanpura[k % 4], at)

  // tabla / dholak, keherwa cycle
  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate)
  const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  const tone = (f0, f1, at, len, g) => {
    const o = ctx.createOscillator(), gg = ctx.createGain()
    o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + len * 0.7)
    gg.gain.setValueAtTime(g, at); gg.gain.exponentialRampToValueAtTime(0.001, at + len)
    o.connect(gg); gg.connect(bus); o.start(at); o.stop(at + len + 0.02)
  }
  const click = (at, f, g, len) => {
    const s = ctx.createBufferSource(); s.buffer = noise
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.4
    const gg = ctx.createGain(); gg.gain.setValueAtTime(g, at); gg.gain.exponentialRampToValueAtTime(0.001, at + len)
    s.connect(bp); bp.connect(gg); gg.connect(bus); s.start(at); s.stop(at + len + 0.02)
  }
  const totalBeats = Math.floor((total - 1.5) / BEAT)
  for (let b = 0; b < totalBeats; b++) {
    const at = t0 + 0.1 + b * BEAT, h = CYCLE[b % 8]
    if (h === 'D') { tone(165, 62, at, 0.34, 0.5); tone(520, 440, at, 0.14, 0.14); click(at, 2600, 0.12, 0.05) }
    else if (h === 'g') tone(140, 70, at, 0.28, 0.32)
    else if (h === 'n') { tone(620, 590, at, 0.11, 0.17); click(at, 3200, 0.1, 0.04) }
    else if (h === 't') { tone(430, 400, at, 0.22, 0.14); click(at, 1800, 0.08, 0.05) }
    else click(at, 900, 0.16, 0.06) // ka
    if (b % 8 === 0) { // ghungroo shimmer on the first beat of every cycle
      for (let i = 0; i < 4; i++) click(at + i * 0.045, 6000, 0.035, 0.04)
    }
  }

  // shehnai-style lead: reedy saws, two nasal formants, vibrato, glides between notes
  let t = t0 + INTRO_BEATS * BEAT + 0.1, prev = null
  for (const [m, d] of MELODY) {
    const dur = d * BEAT, f = hz(m + 12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.17, t + 0.06); g.gain.setValueAtTime(0.17, t + dur * 0.78); g.gain.linearRampToValueAtTime(0, t + dur + 0.04)
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 950; f1.Q.value = 2.2
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2400; f2.Q.value = 1.6
    const mix = ctx.createGain(); mix.gain.value = 1
    const lfo = ctx.createOscillator(), lg = ctx.createGain()
    lfo.frequency.value = 5.8; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(11, t + Math.min(0.4, dur)); lfo.connect(lg)
    for (const det of [-7, 0, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'
      o.frequency.setValueAtTime(prev ? prev : f, t); if (prev) o.frequency.linearRampToValueAtTime(f, t + 0.09)
      o.detune.value = det; lg.connect(o.detune); o.connect(f1); o.connect(f2); o.start(t); o.stop(t + dur + 0.06)
    }
    f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(bus)
    lfo.start(t); lfo.stop(t + dur + 0.06)
    prev = f; t += dur
  }
  return { total, end }
}

/* ---------- a tiny shared store so the envelope and the music button agree ---------- */
let playing = false
let stopper = null
const subs = new Set()
const set = (p) => { playing = p; subs.forEach((f) => f(p)) }

export function stopMusic() {
  const s = stopper
  stopper = null
  if (s) s()
  set(false)
}

/** Call from a tap handler. */
export function startMusic() {
  if (playing) return
  try {
    if (SITE.musicUrl) {
      const el = new Audio(SITE.musicUrl)
      el.volume = 0.85
      el.addEventListener('ended', () => { stopper = null; set(false) })
      el.addEventListener('error', () => { stopper = null; set(false) })
      el.play().catch(() => { stopper = null; set(false) })
      stopper = () => { el.pause(); el.removeAttribute('src'); el.load() }
      set(true)
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    ctx.resume?.()
    const { total } = scheduleWeddingMusic(ctx)
    const timer = setTimeout(() => { stopper = null; ctx.close().catch(() => {}); set(false) }, (total + 0.3) * 1000)
    stopper = () => {
      clearTimeout(timer)
      try { ctx.destination.disconnect() } catch { /* ignore */ }
      ctx.close().catch(() => {})
    }
    set(true)
  } catch (e) {
    console.error(e)
    set(false)
  }
}

export function toggleMusic() { playing ? stopMusic() : startMusic() }

export function useMusic() {
  const [on, setOn] = useState(playing)
  useEffect(() => { subs.add(setOn); setOn(playing); return () => subs.delete(setOn) }, [])
  return on
}