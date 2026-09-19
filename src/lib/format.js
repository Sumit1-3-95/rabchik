/** "2026-12-10" → "Dec 10" */
export function dayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Two theme colours → CSS gradient (event colour identity) */
export function gradient(colors) {
  const [a, b] = colors && colors.length >= 2 ? colors : ['#E7D9C9', '#C9B8A3']
  return `radial-gradient(circle at 25% 15%, rgba(255,255,255,.55), rgba(255,255,255,0) 55%), linear-gradient(140deg, ${a}, ${b})`
}

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** The day to show first: today if it is a wedding day, else the first day. */
export function pickDay(days) {
  const today = new Date().toISOString().slice(0, 10)
  return days.includes(today) ? today : days[0]
}
