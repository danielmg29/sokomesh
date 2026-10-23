// A per-browser yes/no preference (the navigation collapsed, for one), kept in localStorage. It is a
// convenience only: when storage is blocked or empty the default applies, and the server always renders the
// default so hydration matches.

import { useCallback, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
// This page's choices, so a choice holds even where storage is blocked.
const chosen = new Map<string, boolean>()

function read(key: string, fallback: boolean): boolean {
  if (chosen.has(key)) return chosen.get(key)!
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

function subscribe(cb: () => void) {
  // The same choice made in another tab wins over this page's.
  const onStorage = (e: StorageEvent) => { if (e.key) chosen.delete(e.key); cb() }
  listeners.add(cb)
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

export function useStoredFlag(key: string, fallback = false): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback)
  const set = useCallback((next: boolean) => {
    chosen.set(key, next)
    try {
      localStorage.setItem(key, next ? '1' : '0')
    } catch {
      // Storage blocked: the choice holds for this page only.
    }
    listeners.forEach(l => l())
  }, [key])
  return [value, set]
}
