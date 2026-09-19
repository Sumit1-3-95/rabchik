import { useCallback, useEffect, useRef, useState } from 'react'

/** Tiny data-fetching hook: const { data, loading, error, refetch } = useQuery(async () => ..., [deps]) */
export function useQuery(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const alive = useRef(true)

  const run = useCallback(async () => {
    try {
      const data = await fnRef.current()
      if (alive.current) setState({ data, loading: false, error: null })
    } catch (error) {
      console.error(error)
      if (alive.current) setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    alive.current = true
    setState((s) => ({ ...s, loading: true }))
    run()
    return () => { alive.current = false }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, refetch: run }
}

/** Simple toast: const toast = useToast(); toast('Saved') — render <Toast /> once in the layout */
let listener = null
export const toast = (msg) => listener && listener(msg)
export function useToastState() {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    listener = (m) => {
      setMsg(m)
      setTimeout(() => setMsg(null), 2200)
    }
    return () => { listener = null }
  }, [])
  return msg
}
