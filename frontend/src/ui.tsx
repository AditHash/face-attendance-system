import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'visionattend.theme'

function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

// 'system' removes the attribute so the prefers-color-scheme rules in style.css apply.
export function applyTheme(theme: Theme = storedTheme()) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const labels: Record<Theme, string> = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' }

export function ThemeToggle() {
  const [theme, setTheme] = useState(storedTheme)
  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch { /* storage unavailable: theme still applies for this visit */ }
  }, [theme])
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  return <button className="theme-toggle" onClick={() => setTheme(next[theme])}
    aria-label={`${labels[theme]}. Switch to ${labels[next[theme]].toLowerCase()}`}>
    <Icon size={16} aria-hidden="true" />{labels[theme]}
  </button>
}

export type Strength = { label: string; tone: 'ok' | 'pending' | 'bad' }

// Bands relative to the configured threshold. Raw cosine is not a probability.
export function strengthOf(similarity: number, threshold: number): Strength {
  if (similarity < threshold) return { label: 'Below threshold', tone: 'bad' }
  if (similarity < threshold + 0.1) return { label: 'Fair', tone: 'pending' }
  if (similarity < threshold + 0.25) return { label: 'Good', tone: 'ok' }
  return { label: 'Strong', tone: 'ok' }
}

export function MatchStrength({ similarity, threshold }: { similarity: number; threshold: number }) {
  const { label, tone } = strengthOf(similarity, threshold)
  const fill = Math.max(0, Math.min(1, similarity)) * 100
  const marker = Math.max(0, Math.min(1, threshold)) * 100
  return <span className={'strength tone-' + tone} title={`Cosine similarity ${similarity.toFixed(3)} · threshold ${threshold.toFixed(3)}`}>
    <span className="strength-bar" aria-hidden="true">
      <span className="strength-fill" style={{ width: fill + '%' }} />
      <span className="strength-mark" style={{ left: marker + '%' }} />
    </span>
    <span className="strength-value">{similarity.toFixed(3)}</span>
    <span className="strength-label">{label}</span>
  </span>
}
