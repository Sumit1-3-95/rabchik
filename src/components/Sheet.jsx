import { useEffect } from 'react'

/** Bottom sheet with backdrop. Closes on backdrop tap or Escape. */
export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        {title && <div className="h2">{title}</div>}
        {children}
      </div>
    </>
  )
}
