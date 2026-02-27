<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Link, QrCode, FileText, ExternalLink, Printer } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { useAppState } from '~/composables/useAppState'
import { buildShareUrl, formatScheduleText } from '~/composables/useShare'
import { useShare } from '~/composables/useShare'
import { MONTH_NAMES } from '~/utils/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const appState = useAppState()
const { copyToClipboard, webShare, supportsWebShare } = useShare()
const { showToast } = appState

const showQR = ref(false)
const qrDataUrl = ref('')

function getSharePayload() {
  return {
    doctors: appState.doctors.value,
    schedule: appState.schedule.value,
    marks: appState.marks.value,
    month: appState.month.value,
    year: appState.year.value,
    constraints: appState.constraints.value,
    nextId: appState.doctors.value.length + 1,
  }
}

async function handleCopyLink() {
  try {
    if (!appState.schedule.value) {
      showToast('Δημιουργήστε πρώτα πρόγραμμα')
      return
    }
    const url = buildShareUrl(getSharePayload())
    const ok = await copyToClipboard(url)
    showToast(ok ? 'Ο σύνδεσμος αντιγράφηκε!' : 'Σφάλμα αντιγραφής')
  } catch (e: any) {
    showToast(`Error: ${e?.message ?? 'unknown'}`)
  }
  emit('close')
}

async function handleShowQR() {
  if (!appState.schedule.value) {
    showToast('Δημιουργήστε πρώτα πρόγραμμα')
    return
  }
  showQR.value = true
  await nextTick()
  const url = buildShareUrl(getSharePayload())
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
  }
  catch {
    showToast('Σφάλμα δημιουργίας QR')
  }
}

function handleBackFromQR() {
  showQR.value = false
  qrDataUrl.value = ''
}

function handlePrintQR() {
  const monthName = MONTH_NAMES[appState.month.value] ?? ''
  const title = `Εφημερίες — ${monthName} ${appState.year.value}`
  const printWindow = window.open('', '_blank', 'width=400,height=500')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        h1 { font-size: 18px; margin-bottom: 16px; text-align: center; }
        img { max-width: 300px; }
        p { font-size: 12px; color: #666; margin-top: 12px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <img src="${qrDataUrl.value}" alt="QR Code" />
      <p>Σαρώστε τον κωδικό QR για να δείτε το πρόγραμμα</p>
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}

async function handleCopyText() {
  if (!appState.schedule.value) {
    showToast('Δεν υπάρχει πρόγραμμα')
    return
  }
  const text = formatScheduleText(appState.schedule.value!, appState.doctors.value, appState.year.value, appState.month.value, appState.marks.value)
  const ok = await copyToClipboard(text)
  if (ok) {
    showToast('Το κείμενο αντιγράφηκε!')
  }
  else {
    showToast('Σφάλμα αντιγραφής')
  }
  emit('close')
}

async function handleWebShare() {
  if (!appState.schedule.value) {
    showToast('Δεν υπάρχει πρόγραμμα')
    return
  }
  const url = buildShareUrl(getSharePayload())
  const monthName = MONTH_NAMES[appState.month.value] ?? ''
  const title = `Εφημερίες — ${monthName} ${appState.year.value}`

  const ok = await webShare(title, '', url)
  if (ok) {
    emit('close')
  }
  else {
    // Fallback to copy text
    const copied = await copyToClipboard(text)
    if (copied) showToast('Το κείμενο αντιγράφηκε!')
    emit('close')
  }
}

// Reset QR view when sheet closes
watch(() => props.open, (val) => {
  if (!val) {
    showQR.value = false
    qrDataUrl.value = ''
  }
})
</script>

<template>
  <BottomSheet :open="open" title="Κοινοποίηση" @close="emit('close')">
    <!-- QR Code View -->
    <div v-if="showQR" class="flex flex-col items-center gap-4 pb-4">
      <div v-if="qrDataUrl" class="bg-white p-4 rounded-[12px] shadow-sm">
        <img :src="qrDataUrl" alt="QR Code" class="w-[250px] h-[250px]" />
      </div>
      <div v-else class="w-[250px] h-[250px] flex items-center justify-center">
        <div class="text-muted animate-pulse text-[14px]">Δημιουργία QR...</div>
      </div>

      <p class="text-[13px] text-muted text-center">
        Σαρώστε τον κωδικό QR για να δείτε το πρόγραμμα
      </p>

      <div class="flex gap-3 w-full">
        <button
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] text-[14px] font-medium transition-all active:scale-[0.98]"
          style="background-color: var(--color-bg); color: var(--color-text)"
          @click="handleBackFromQR"
        >
          Πίσω
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] text-[14px] font-medium transition-all active:scale-[0.98]"
          style="background-color: var(--color-accent); color: white"
          @click="handlePrintQR"
        >
          <Printer class="w-[16px] h-[16px]" />
          Εκτύπωση QR
        </button>
      </div>
    </div>

    <!-- Main share options -->
    <div v-else class="flex flex-col gap-1 pb-2">
      <button
        class="flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-all active:scale-[0.98] hover:bg-background"
        @click="handleCopyLink"
      >
        <div class="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-accent-soft">
          <Link class="w-[18px] h-[18px] text-accent" />
        </div>
        <div class="text-left">
          <div class="text-[15px] font-medium text-foreground">Αντιγραφή συνδέσμου</div>
          <div class="text-[12px] text-muted">Σύνδεσμος μόνο για προβολή</div>
        </div>
      </button>

      <button
        class="flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-all active:scale-[0.98] hover:bg-background"
        @click="handleShowQR"
      >
        <div class="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-accent-soft">
          <QrCode class="w-[18px] h-[18px] text-accent" />
        </div>
        <div class="text-left">
          <div class="text-[15px] font-medium text-foreground">QR Code</div>
          <div class="text-[12px] text-muted">Εκτυπώσιμος κωδικός QR</div>
        </div>
      </button>

      <button
        class="flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-all active:scale-[0.98] hover:bg-background"
        @click="handleCopyText"
      >
        <div class="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-accent-soft">
          <FileText class="w-[18px] h-[18px] text-accent" />
        </div>
        <div class="text-left">
          <div class="text-[15px] font-medium text-foreground">Αντιγραφή κειμένου</div>
          <div class="text-[12px] text-muted">Μορφοποιημένο κείμενο για WhatsApp/Viber</div>
        </div>
      </button>

      <button
        v-if="supportsWebShare"
        class="flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-all active:scale-[0.98] hover:bg-background"
        @click="handleWebShare"
      >
        <div class="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-accent-soft">
          <ExternalLink class="w-[18px] h-[18px] text-accent" />
        </div>
        <div class="text-left">
          <div class="text-[15px] font-medium text-foreground">Κοινοποίηση...</div>
          <div class="text-[12px] text-muted">Μέσω εφαρμογών του συστήματος</div>
        </div>
      </button>
    </div>
  </BottomSheet>
</template>
