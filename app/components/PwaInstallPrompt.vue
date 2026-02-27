<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Download, X } from 'lucide-vue-next'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const showPrompt = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

function isDismissed(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  const timestamp = parseInt(dismissed, 10)
  if (Date.now() - timestamp > DISMISS_DURATION) {
    localStorage.removeItem(DISMISS_KEY)
    return false
  }
  return true
}

function handleBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent

  // Only show if not recently dismissed and not already installed
  if (!isDismissed() && !window.matchMedia('(display-mode: standalone)').matches) {
    // Small delay so the app loads first
    setTimeout(() => {
      showPrompt.value = true
    }, 2000)
  }
}

async function install() {
  if (!deferredPrompt.value) return

  await deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    showPrompt.value = false
  }

  deferredPrompt.value = null
}

function dismiss() {
  showPrompt.value = false
  localStorage.setItem(DISMISS_KEY, Date.now().toString())
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', () => {
    showPrompt.value = false
    deferredPrompt.value = null
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showPrompt"
      class="fixed bottom-[68px] md:bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
    >
      <div class="bg-surface border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3">
        <!-- Icon -->
        <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Download class="w-5 h-5 text-accent" />
        </div>

        <!-- Text -->
        <div class="flex-1 min-w-0">
          <p class="text-[14px] font-semibold text-foreground leading-tight">
            Εγκατάσταση εφαρμογής
          </p>
          <p class="text-[12px] text-muted mt-0.5 leading-snug">
            Προσθέστε τις Εφημερίες στην αρχική οθόνη για γρήγορη πρόσβαση
          </p>

          <!-- Actions -->
          <div class="flex gap-2 mt-2.5">
            <button
              class="px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
              @click="install"
            >
              Εγκατάσταση
            </button>
            <button
              class="px-3 py-1.5 text-[12px] font-medium rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors"
              @click="dismiss"
            >
              Όχι τώρα
            </button>
          </div>
        </div>

        <!-- Close -->
        <button
          class="flex-shrink-0 p-1 -mt-1 -mr-1 text-muted hover:text-foreground transition-colors"
          @click="dismiss"
          aria-label="Κλείσιμο"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>
