import { ref } from 'vue'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Doctor, MarksMap, Constraints } from '~/utils/types'
import { MONTH_NAMES, DAY_NAMES, getDaysInMonth, getDayOfWeekMondayBased } from '~/utils/types'

export interface SharePayload {
  doctors: Doctor[]
  schedule: (number | null)[] | null
  marks: MarksMap
  month: number
  year: number
  constraints: Constraints
  nextId: number
}

/** Encode state to a compressed URL-safe string */
export function encodeShareData(payload: SharePayload): string {
  const json = JSON.stringify(payload)
  return compressToEncodedURIComponent(json)
}

/** Decode a compressed URL-safe string back to state */
export function decodeShareData(encoded: string): SharePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as SharePayload
  }
  catch {
    return null
  }
}

/** Build the share URL with compressed data */
export function buildShareUrl(payload: SharePayload): string {
  const encoded = encodeShareData(payload)
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  return `${base}?data=${encoded}`
}

/** Format schedule as plain text for WhatsApp/Viber sharing */
export function formatScheduleText(
  schedule: (number | null)[],
  doctors: Doctor[],
  year: number,
  month: number,
  marks: MarksMap,
): string {
  const daysInMonth = getDaysInMonth(year, month)
  const monthName = MONTH_NAMES[month]?.toUpperCase() ?? ''
  const lines: string[] = [`ΕΦΗΜΕΡΙΕΣ — ${monthName} ${year}`, '']

  for (let i = 0; i < daysInMonth; i++) {
    const dayNum = i + 1
    const dayOfWeek = getDayOfWeekMondayBased(year, month, dayNum)
    const dayName = DAY_NAMES[dayOfWeek] ?? ''
    const docId = schedule[i]
    const doc = doctors.find(d => d.id === docId)
    const name = doc?.name ?? '—'

    // Check if day is holiday
    let isHoliday = false
    for (const d of doctors) {
      if (marks[d.id]?.[i] === 'holiday') {
        isHoliday = true
        break
      }
    }

    lines.push(`${String(dayNum).padStart(2, ' ')} ${dayName} — ${name}`)
  }

  return lines.join('\n')
}

// --- Singleton state ---
const isReadOnly = ref(false)
const sharedData = ref<SharePayload | null>(null)
const supportsWebShare = ref(false)
let initialized = false

/** Initialize share state (call once from app root onMounted) */
function initShare() {
  if (initialized) return
  initialized = true

  // Check for shared data in URL
  const params = new URLSearchParams(window.location.search)
  const data = params.get('data')
  if (data) {
    const decoded = decodeShareData(data)
    if (decoded) {
      isReadOnly.value = true
      sharedData.value = decoded
    }
  }

  // Check Web Share API support
  supportsWebShare.value = typeof navigator !== 'undefined' && !!navigator.share
}

/** Copy text to clipboard — iOS Safari compatible */
function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Method 1: ClipboardItem with Blob (works on modern iOS Safari 13.4+)
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const blob = new Blob([text], { type: 'text/plain' })
        const item = new ClipboardItem({ 'text/plain': blob })
        navigator.clipboard.write([item]).then(() => resolve(true)).catch(() => {
          resolve(fallbackCopy(text))
        })
        return
      } catch {
        // fall through
      }
    }
    
    // Method 2: clipboard.writeText
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => {
        resolve(fallbackCopy(text))
      })
      return
    }
    
    // Method 3: execCommand fallback
    resolve(fallbackCopy(text))
  })
}

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  // Must be visible on iOS — off-screen doesn't work
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;opacity:0.01'
  document.body.appendChild(textarea)
  
  // iOS specific selection
  if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
    textarea.contentEditable = 'true'
    textarea.readOnly = false
    const range = document.createRange()
    range.selectNodeContents(textarea)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
    textarea.setSelectionRange(0, 999999)
  } else {
    textarea.select()
  }
  
  let result = false
  try {
    result = document.execCommand('copy')
  } catch {
    result = false
  }
  document.body.removeChild(textarea)
  return result
}

/** Share via Web Share API */
async function webShare(title: string, text: string, url?: string): Promise<boolean> {
  if (!navigator.share) return false
  try {
    await navigator.share({ title, text, url })
    return true
  }
  catch {
    return false
  }
}

/** Clear read-only mode (navigate to clean URL) */
function clearReadOnly() {
  const url = new URL(window.location.href)
  url.searchParams.delete('data')
  window.history.replaceState({}, '', url.toString())
  isReadOnly.value = false
  sharedData.value = null
}

/** Composable for managing read-only share state (singleton) */
export function useShare() {
  return {
    isReadOnly,
    sharedData,
    supportsWebShare,
    initShare,
    copyToClipboard,
    webShare,
    clearReadOnly,
  }
}
