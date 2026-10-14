'use client'

import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { readTheme, themeStorageKey, writeTheme, type ThemePreference } from '@/lib/theme'
import { Segmented } from './choice'
import { Icon } from './icon'

const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // Another tab changed the choice: apply it here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== themeStorageKey) return
    writeTheme(readTheme())
    listeners.forEach(l => l())
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

function choose(theme: ThemePreference) {
  writeTheme(theme)
  listeners.forEach(l => l())
}

const options: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

/** Light, dark or follow the system. `labels="icon"` keeps the words for screen readers only. */
export function ThemeSwitch({ tone = 'default', labels = 'text', className }: { tone?: 'default' | 'chrome'; labels?: 'text' | 'icon'; className?: string }) {
  const value = useSyncExternalStore(subscribe, readTheme, () => 'system' as const)
  return (
    <Segmented
      label="Colour theme"
      size="sm"
      tone={tone}
      value={value}
      onValueChange={choose}
      className={className}
      items={options.map(o => ({
        value: o.value,
        label: <><Icon icon={o.icon} /><span className={labels === 'icon' ? 'sr-only' : undefined}>{o.label}</span></>,
      }))}
    />
  )
}
