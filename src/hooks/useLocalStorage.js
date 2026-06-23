import { useState, useEffect } from 'react'

// Persisted state helper — mirrors the original's localStorage usage
// (hy_theme / hy_accent), guarded so it never throws in private mode / SSR.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored != null ? stored : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* ignore */
    }
  }, [key, value])

  return [value, setValue]
}
