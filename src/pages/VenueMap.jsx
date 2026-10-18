import { useEffect, useRef, useState } from 'react'
import { SITE } from '../config'
import '../venuemap.css'

/*
 * Simple map of Riddhi Resorts, B block, redrawn from the resort's two floor plans.
 * Coordinates are in the photo's own pixels so the shapes line up with the originals.
 */
const C = { pink: '#f6c4c4', yel: '#fbeac0', banq: '#f7dc9a', pur: '#dccce6', grn: '#cfe6c3', lawn: '#cfe3a6', grey: '#dfd9cd', blue: '#c7e0ee', road: '#efe7d6', paper: '#fffaf0' }

const GROUND = {
  viewBox: '10 135 1285 975',
  tip: 'Stairs up: top-left and top-right corners of the hall.',
  zones: [
    { id: 'base', x: 25, y: 150, w: 1255, h: 950, fill: C.paper, plain: true },
    { id: 'lobby', x: 188, y: 150, w: 770, h: 698, fill: C.yel, plain: true },
    { id: 'banq', x: 245, y: 333, w: 570, h: 355, fill: C.banq, lines: ['Banquet Hall'], fs: 58, icon: 'rings', info: 'Banquet Hall: the big hall in the middle. Its door is on the side facing the Main Entry.' },
    { id: 'door', x: 414, y: 668, w: 228, h: 34, fill: '#fff3cf', lines: ['Banquet door'], fs: 24, small: true },
    { id: 'toil', x: 245, y: 150, w: 120, h: 70, fill: C.blue, lines: ['Toilets'], fs: 30, info: 'Toilets: top-left of the hall. There are also Common Toilets near the Main Gate.' },
    { id: 'north', zone: 'north', x: 245, y: 222, w: 570, h: 72, fill: C.pink, lines: ['Rooms 109–115'], fs: 40 },
    { id: 'west', zone: 'west', x: 104, y: 270, w: 82, h: 578, fill: C.pink, lines: ['Rooms 116–125'], fs: 40, rot: -90 },
    { id: 'east', zone: 'east', x: 866, y: 294, w: 92, h: 430, fill: C.pink, lines: ['Rooms 101–108'], fs: 40, rot: -90 },
    { id: 'makeup', x: 866, y: 152, w: 92, h: 140, fill: C.pur, lines: ['Makeup', 'Room'], fs: 28, info: 'Makeup Room: top-right corner, above Rooms 101–108.' },
    { id: 'ex126', zone: 'exec', x: 245, y: 722, w: 215, h: 126, fill: C.grn, lines: ['Room 126', 'Executive'], fs: 32 },
    { id: 'entry', x: 460, y: 722, w: 93, h: 126, fill: '#fff6dc', lines: ['Main', 'Entry'], fs: 32, red: true, info: 'Main Entry: the way into the lobby, facing the Banquet Hall.' },
    { id: 'ex127', zone: 'exec', x: 553, y: 722, w: 180, h: 126, fill: C.grn, lines: ['Room 127', 'Executive'], fs: 32 },
    { id: 'store', x: 733, y: 722, w: 83, h: 126, fill: C.pur, lines: ['Store'], fs: 28 },
    { id: 'recep', x: 816, y: 722, w: 142, h: 126, fill: C.pur, lines: ['New', 'Reception'], fs: 30, info: 'New Reception Area: right of the Store, next to the Main Entry.' },
    { id: 'gate', x: 188, y: 778, w: 56, h: 70, fill: '#fff', lines: ['Gate'], fs: 24, small: true },
    { id: 'svcL', x: 25, y: 210, w: 75, h: 638, fill: C.road, lines: ['Service lane'], fs: 34, rot: -90 },
    { id: 'svcR', x: 960, y: 152, w: 77, h: 696, fill: C.road, lines: ['Service lane'], fs: 34, rot: -90 },
    { id: 'lawn', x: 1040, y: 155, w: 240, h: 880, fill: C.lawn, lines: ['Big Lawn'], fs: 60, icon: 'arch', info: 'Big Lawn: the large open lawn on the far right.' },
    { id: 'park', x: 28, y: 848, w: 705, h: 250, fill: C.grey, lines: ['Parking'], fs: 58, icon: 'car', info: 'Parking: bottom-left, below Rooms 116–125 and the two Executive Rooms.' },
    { id: 'path1', x: 853, y: 848, w: 78, h: 190, fill: C.road, lines: ['Path', 'Way'], fs: 26 },
    { id: 'ctoil', x: 948, y: 885, w: 90, h: 130, fill: C.blue, lines: ['Common', 'Toilets'], fs: 24, small: true },
    { id: 'path2', x: 818, y: 1038, w: 402, h: 62, fill: C.road, lines: ['Path Way'], fs: 32 },
    { id: 'gate2', x: 1220, y: 990, w: 60, h: 110, fill: '#fff', lines: ['Main', 'Gate'], fs: 24, red: true, small: true, info: 'Main Gate: bottom-right corner. Walk in along the Path Way to Reception.' },
  ],
  labels: [
    { x: 545, y: 322, t: 'Lobby', fs: 30 }, { x: 216, y: 548, t: 'Lobby', fs: 30, rot: -90 }, { x: 840, y: 548, t: 'Lobby', fs: 30, rot: -90 },
    { x: 216, y: 215, t: 'Stairs ↑', fs: 24, rot: -90 }, { x: 840, y: 215, t: 'Stairs ↑', fs: 24, rot: -90 },
  ],
  route: 'M1250 1070 H892 V868',
  legend: [['Rooms', C.pink], ['Executive rooms', C.grn], ['Halls & lobby', C.banq], ['Facilities', C.pur], ['Toilets', C.blue], ['Parking & paths', C.grey]],
}

const FIRST = {
  viewBox: '135 135 1065 900',
  tip: 'Stairs down: top-left and top-right corners. Lift: bottom-left.',
  zones: [
    { id: 'lobby', x: 248, y: 258, w: 802, h: 626, fill: C.yel, plain: true },
    { id: 'open', x: 330, y: 372, w: 635, h: 455, fill: '#fff6e0', lines: ['Open Space'], fs: 58, info: 'Open Space: the open area in the middle of the first floor, with the lobby all around it.' },
    { id: 'dsL', x: 158, y: 155, w: 90, h: 135, fill: C.blue, lines: ['Down', 'Stairs'], fs: 28 },
    { id: 'dsR', x: 965, y: 155, w: 85, h: 160, fill: C.blue, lines: ['Down', 'Stairs'], fs: 28 },
    { id: 'n1', zone: 'north', x: 248, y: 155, w: 204, h: 105, fill: C.pink, lines: ['219–220'], fs: 36 },
    { id: 'n2', zone: 'north', x: 453, y: 233, w: 512, h: 88, fill: C.pink, lines: ['Rooms 212–218'], fs: 40 },
    { id: 'west', zone: 'west', x: 158, y: 290, w: 90, h: 720, fill: C.pink, lines: ['Rooms 221–229'], fs: 40, rot: -90 },
    { id: 'east', zone: 'east', x: 1050, y: 155, w: 122, h: 750, fill: C.pink, lines: ['Rooms 201–210'], fs: 40, rot: -90 },
    { id: 'lift', x: 250, y: 884, w: 80, h: 126, fill: C.blue, lines: ['Lift'], fs: 30, info: 'Lift: bottom-left corner of the first floor.' },
    { id: 'store', x: 332, y: 884, w: 92, h: 126, fill: C.pur, lines: ['Store'], fs: 28 },
    { id: 'south', zone: 'south', x: 424, y: 884, w: 584, h: 126, fill: C.grn, lines: ['Rooms 231–234', 'Executive rooms'], fs: 34 },
    { id: 'balc', x: 1008, y: 884, w: 165, h: 126, fill: C.blue, lines: ['Balcony'], fs: 32, info: 'Balcony: bottom-right corner of the first floor.' },
  ],
  labels: [{ x: 660, y: 352, t: 'Lobby', fs: 32 }, { x: 660, y: 862, t: 'Lobby', fs: 32 }, { x: 290, y: 600, t: 'Lobby', fs: 30, rot: -90 }, { x: 1005, y: 600, t: 'Lobby', fs: 30, rot: -90 }],
  legend: [['Rooms', C.pink], ['Executive rooms', C.grn], ['Lobby', C.yel], ['Store', C.pur], ['Lift, stairs, balcony', C.blue]],
}

const FLOORS = { g: GROUND, f: FIRST }

/** Where is room N? Returns { floor, zone, text } or null. */
function locate(n) {
  const side = (floor, zone, text) => ({ floor, zone, text })
  if (n >= 101 && n <= 108) return side('g', 'east', 'Ground floor, right-hand wing (beside the Service lane and the Big Lawn).')
  if (n >= 109 && n <= 115 && n !== 113) return side('g', 'north', 'Ground floor, top wing (the far side of the Banquet Hall from the Main Entry).')
  if (n >= 116 && n <= 125) return side('g', 'west', 'Ground floor, left-hand wing (next to the Parking side).')
  if (n === 126 || n === 127) return side('g', 'exec', 'Ground floor, Executive Room beside the Main Entry.')
  if (n >= 201 && n <= 210) return side('f', 'east', 'First floor, right-hand wing.')
  if (n >= 212 && n <= 220) return side('f', 'north', 'First floor, top wing.')
  if (n >= 221 && n <= 229) return side('f', 'west', 'First floor, left-hand wing.')
  if (n >= 231 && n <= 234) return side('f', 'south', `First floor, bottom wing${n > 231 ? ' (Executive room)' : ''}.`)
  return null
}

function Icon({ kind, cx, cy }) {
  if (kind === 'rings') return (<g fill="none" stroke="#7b263a" strokeWidth="6"><circle cx={cx - 20} cy={cy} r="30" /><circle cx={cx + 20} cy={cy} r="30" /></g>)
  if (kind === 'car') return (
    <g fill="#5b5346"><rect x={cx - 42} y={cy - 12} width="84" height="26" rx="10" /><path d={`M${cx - 26} ${cy - 12} l10 -20 h32 l10 20z`} /><circle cx={cx - 24} cy={cy + 16} r="9" fill="#2f2a22" /><circle cx={cx + 24} cy={cy + 16} r="9" fill="#2f2a22" /></g>)
  if (kind === 'arch') return (
    <g fill="none" stroke="#7b263a" strokeWidth="7" strokeLinecap="round"><path d={`M${cx - 44} ${cy + 40} V${cy - 6} a44 44 0 0 1 88 0 V${cy + 40}`} /><circle cx={cx - 44} cy={cy - 6} r="8" fill="#f2a516" stroke="none" /><circle cx={cx + 44} cy={cy - 6} r="8" fill="#f2a516" stroke="none" /><circle cx={cx} cy={cy - 50} r="8" fill="#f2a516" stroke="none" /></g>)
  return null
}

function Txt({ cx, cy, lines, fs, rot, fill = '#3b2a2a', weight = 700 }) {
  fs = Math.max(fs, 32)
  const lh = fs * 1.12
  const y0 = cy - ((lines.length - 1) * lh) / 2
  return (
    <text textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={weight} fill={fill} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
      {lines.map((l, i) => <tspan key={i} x={cx} y={y0 + i * lh}>{l}</tspan>)}
    </text>
  )
}

function Floor({ data, hi, sel, onPick, zoom }) {
  return (
    <svg viewBox={data.viewBox} className={`vm-svg ${zoom ? 'zoom' : ''}`} role="img" aria-label="Floor plan">
      {data.zones.map((z) => {
        const cx = z.x + z.w / 2, cy = z.y + z.h / 2
        const on = (hi && z.zone === hi) || sel === z.id
        return (
          <g key={z.id} className={`vm-z ${z.info ? 'tap' : ''} ${on ? 'hl' : ''}`} onClick={z.info ? () => onPick(z) : undefined}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={z.plain ? 0 : 8} fill={z.fill} stroke={z.red ? '#c0202f' : '#7b263a'} strokeOpacity={z.plain ? 0.25 : z.red ? 0.95 : 0.5} strokeWidth={z.red ? 6 : 3} />
            {z.icon && <Icon kind={z.icon} cx={cx} cy={cy - (z.icon === 'rings' ? 52 : z.icon === 'arch' ? 90 : 56)} />}
            {z.lines && <Txt cx={cx} cy={z.icon ? cy + (z.icon === 'rings' ? 28 : z.icon === 'arch' ? 0 : 34) : cy} lines={z.lines} fs={z.fs} rot={z.rot} fill={z.red ? '#a3182a' : '#3b2a2a'} />}
          </g>
        )
      })}
      {data.labels.map((l, i) => <Txt key={i} cx={l.x} cy={l.y} lines={[l.t]} fs={l.fs} rot={l.rot} fill="#8a6b2e" weight={600} />)}
      {data.route && <path d={data.route} fill="none" stroke="#c0202f" strokeWidth="9" strokeDasharray="4 22" strokeLinecap="round" className="vm-route" />}
    </svg>
  )
}

export default function VenueMap() {
  const [floor, setFloor] = useState('g')
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(null)
  const [msg, setMsg] = useState('')
  const [sel, setSel] = useState(null)
  const [zoom, setZoom] = useState(false)
  const scroller = useRef(null)
  const data = FLOORS[floor]

  const find = (v) => {
    const t = v.replace(/\D/g, '').slice(0, 3)
    setQ(t)
    setSel(null)
    if (t.length < 3) { setHi(null); setMsg(''); return }
    const r = locate(+t)
    if (!r) { setHi(null); setMsg(`Room ${t} is not on the plan. Rooms run 101–127 on the ground floor and 201–234 on the first floor.`); return }
    setFloor(r.floor); setHi(r.zone); setMsg(`Room ${t}: ${r.text}`)
  }
  const pick = (z) => { setHi(null); setSel(z.id); setMsg(z.info) }
  const switchFloor = (f) => { setFloor(f); setHi(null); setSel(null); setMsg(''); setQ('') }

  // start the sideways scroll in the middle of the map
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = zoom ? (el.scrollWidth - el.clientWidth) / 2 : 0
  }, [floor, zoom])

  return (
    <main className="page tight vm">
      <div>
        <h1 className="title" style={{ fontSize: 30 }}>Venue map</h1>
        <div className="small muted">Riddhi Resorts · B Block · Jaipur</div>
      </div>

      <div className="vm-seg" role="tablist" aria-label="Floor">
        <button role="tab" aria-selected={floor === 'g'} className={floor === 'g' ? 'on' : ''} onClick={() => switchFloor('g')}>Ground floor</button>
        <button role="tab" aria-selected={floor === 'f'} className={floor === 'f' ? 'on' : ''} onClick={() => switchFloor('f')}>First floor</button>
      </div>

      <div className="field">
        <label className="label" htmlFor="room">Find your room</label>
        <input id="room" className="input" inputMode="numeric" maxLength={3} placeholder="Type a room number, e.g. 118" value={q} onChange={(e) => find(e.target.value)} />
      </div>

      <div className="vm-card">
        <div className="vm-scroll" ref={scroller}>
          <Floor data={data} hi={hi} sel={sel} onPick={pick} zoom={zoom} />
        </div>
        <div className="vm-hint">
          <button type="button" className="vm-zoom" onClick={() => setZoom((z) => !z)}>{zoom ? 'Fit to screen' : 'Zoom in'}</button>
          <span>Tap a place for details</span>
        </div>
      </div>

      <div className={`vm-msg ${msg ? 'show' : ''}`} role="status" aria-live="polite">{msg || data.tip}</div>

      <div className="vm-legend">
        {data.legend.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}
        {floor === 'g' && <span><i className="red" />Entry / gate</span>}
      </div>

      <div className="vm-actions">
        <a className="btn" href={SITE.mapsUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Directions to the resort</a>
        <a className="btn ghost" href={floor === 'g' ? '/venue-ground.webp' : '/venue-first.webp'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          View the original {floor === 'g' ? 'ground' : 'first'} floor plan
        </a>
      </div>
    </main>
  )
}