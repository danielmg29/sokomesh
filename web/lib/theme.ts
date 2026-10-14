// Colour theme preference. Tokens decide the colours (design/tokens/color.*.json); this module only
// records the reader's choice. "system" removes data-theme so prefers-color-scheme decides.

export type ThemePreference = 'system' | 'light' | 'dark'
export const themePreferences = ['system', 'light', 'dark'] as const satisfies readonly ThemePreference[]

const KEY = 'sokomesh-theme'

export function readTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function writeTheme(theme: ThemePreference) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // Storage blocked: the choice still applies for this page.
  }
}

/** Runs in <head> before first paint, so a saved choice never flashes the other theme. */
export const themeScript = `try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export const themeStorageKey = KEY
