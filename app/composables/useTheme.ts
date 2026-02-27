import { ref, watch, onMounted } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'efimeries-theme'
const theme = ref<Theme>('system')
const resolved = ref<'light' | 'dark'>('light')

function applyTheme() {
  let effective: 'light' | 'dark'
  if (theme.value === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    effective = theme.value
  }
  resolved.value = effective
  document.documentElement.setAttribute('data-theme', effective)

  // Update theme-color meta to match, so browser chrome (status bar, nav bar) follows
  const color = effective === 'dark' ? '#000000' : '#F5F5F7'
  document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')?.setAttribute('content', color)
  document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')?.setAttribute('content', color)
  // Also set/create a non-media theme-color for PWA standalone mode
  let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}

export function useTheme() {
  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored) theme.value = stored
    applyTheme()

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') applyTheme()
    })
  })

  watch(theme, (val) => {
    localStorage.setItem(STORAGE_KEY, val)
    applyTheme()
  })

  function cycleTheme() {
    const order: Theme[] = ['light', 'dark', 'system']
    const idx = order.indexOf(theme.value)
    theme.value = order[(idx + 1) % order.length]
  }

  return { theme, resolved, cycleTheme }
}
