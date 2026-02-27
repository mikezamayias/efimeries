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
