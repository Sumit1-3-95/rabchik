import { useEffect, useRef, useState } from 'react'
import { SITE } from '../config'
import '../venuemap.css'

const FLOORS = {
  g: { src: '/venue-ground.webp', alt: 'Ridhi Resorts B Block, ground floor plan', w: 1305, h: 1206 },
  f: { src: '/venue-first.webp', alt: 'Ridhi Resorts B Block, first floor plan', w: 1312, h: 1199 },
}

/** The resort's own floor plans, one per floor. Tap the plan to zoom in, tap again to zoom out. */
export default function VenueMap() {
  const [floor, setFloor] = useState('g')
  const [zoom, setZoom] = useState(false)
  const scroller = useRef(null)
  const d = FLOORS[floor]

  useEffect(() => {
    const el = scroller.current
    if (el) { el.scrollLeft = zoom ? (el.scrollWidth - el.clientWidth) / 2 : 0; el.scrollTop = 0 }
  }, [floor, zoom])

  return (
    <main className="page tight vm">
      <div>
        <h1 className="title" style={{ fontSize: 30 }}>Venue map</h1>
        <div className="small muted">Riddhi Resorts · B Block · Jaipur</div>
      </div>

      <div className="vm-seg" role="tablist" aria-label="Floor">
        <button role="tab" aria-selected={floor === 'g'} className={floor === 'g' ? 'on' : ''} onClick={() => { setFloor('g'); setZoom(false) }}>Ground floor</button>
        <button role="tab" aria-selected={floor === 'f'} className={floor === 'f' ? 'on' : ''} onClick={() => { setFloor('f'); setZoom(false) }}>First floor</button>
      </div>

      <div className="vm-card">
        <div className={`vm-scroll ${zoom ? 'zoom' : ''}`} ref={scroller}>
          <img src={d.src} alt={d.alt} width={d.w} height={d.h} className="vm-img" draggable="false"
            onClick={() => setZoom((z) => !z)} />
        </div>
        <button type="button" className="vm-zoom" onClick={() => setZoom((z) => !z)}>{zoom ? 'Fit to screen' : 'Tap the plan to zoom in'}</button>
      </div>

      <a className="btn" href={SITE.mapsUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Directions to the resort</a>
    </main>
  )
}