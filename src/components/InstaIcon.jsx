// the Instagram logo: gradient rounded square with the white camera glyph
let n = 0
export default function InstaIcon({ size = 26 }) {
  const id = `ig${(n = (n + 1) % 1000)}`
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <radialGradient id={id} cx="0.3" cy="1.05" r="1.25">
          <stop offset="0" stopColor="#fdcb52" /><stop offset="0.25" stopColor="#fa7e1e" />
          <stop offset="0.5" stopColor="#d62976" /><stop offset="0.78" stopColor="#962fbf" /><stop offset="1" stopColor="#4f5bd5" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6.2" fill={`url(#${id})`} />
      <rect x="5" y="5" width="14" height="14" rx="4.3" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
    </svg>
  )
}
