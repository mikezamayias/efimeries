<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ChevronRight, X } from 'lucide-vue-next'

const STORAGE_KEY = 'efimeries-onboarded'

interface OnboardingStep {
  title: string
  text: string
  target: string | null // CSS selector for spotlight target
}

const steps: OnboardingStep[] = [
  {
    title: 'Καλώς ήρθατε!',
    text: 'Αυτή η εφαρμογή δημιουργεί πρόγραμμα εφημεριών αυτόματα.',
    target: null,
  },
  {
    title: 'Ρυθμίσεις',
    text: 'Προσθέστε τους γιατρούς σας στις Ρυθμίσεις.',
    target: '[data-tab="settings"]',
  },
  {
    title: 'Επιθυμίες',
    text: 'Σημειώστε τις επιθυμίες και αποκλεισμούς στις Επιθυμίες.',
    target: '[data-tab="marks"]',
  },
  {
    title: 'Δημιουργία',
    text: 'Πατήστε «Δημιουργία Προγράμματος» για αυτόματο πρόγραμμα.',
    target: '#generate-btn',
  },
  {
    title: 'Κοινοποίηση',
    text: 'Μοιραστείτε το πρόγραμμα με τους συναδέλφους σας!',
    target: '#share-btn',
  },
]

const isVisible = ref(false)
const currentStep = ref(0)
const spotlightRect = ref<DOMRect | null>(null)

const step = computed(() => steps[currentStep.value])
const totalSteps = steps.length

function show() {
  currentStep.value = 0
  isVisible.value = true
  nextTick(updateSpotlight)
}

function dismiss() {
  isVisible.value = false
  localStorage.setItem(STORAGE_KEY, 'true')
}

function next() {
  if (currentStep.value < totalSteps - 1) {
    currentStep.value++
    nextTick(updateSpotlight)
  } else {
    dismiss()
  }
}

function skip() {
  dismiss()
}

function updateSpotlight() {
  const target = step.value.target
  if (!target) {
    spotlightRect.value = null
    return
  }
  const el = document.querySelector(target) as HTMLElement | null
  if (el) {
    spotlightRect.value = el.getBoundingClientRect()
  } else {
    spotlightRect.value = null
  }
}

// Update spotlight position on resize
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  // Check if first-time user
  const onboarded = localStorage.getItem(STORAGE_KEY)
  if (!onboarded) {
    // Small delay so app is rendered
    setTimeout(() => show(), 600)
  }

  resizeObserver = new ResizeObserver(() => {
    if (isVisible.value) updateSpotlight()
  })
  resizeObserver.observe(document.body)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(currentStep, () => {
  nextTick(updateSpotlight)
})

// Expose restart for settings
defineExpose({ show })

// Spotlight styles
const spotlightStyle = computed(() => {
  if (!spotlightRect.value) return {}
  const r = spotlightRect.value
  const pad = 6
  return {
    left: `${r.left - pad}px`,
    top: `${r.top - pad}px`,
    width: `${r.width + pad * 2}px`,
    height: `${r.height + pad * 2}px`,
  }
})

// Tooltip position: try below the spotlight, or center if no target
const tooltipStyle = computed(() => {
  if (!spotlightRect.value) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
  const r = spotlightRect.value
  const pad = 16
  const below = r.bottom + pad
  const windowH = window.innerHeight
  // If tooltip would go off screen, place above
  if (below + 180 > windowH) {
    return {
      bottom: `${windowH - r.top + pad}px`,
      left: '50%',
      transform: 'translateX(-50%)',
    }
  }
  return {
    top: `${below}px`,
    left: '50%',
    transform: 'translateX(-50%)',
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isVisible" class="fixed inset-0 z-[100]" @click.self="next">
        <!-- Dark overlay with cutout -->
        <div class="absolute inset-0 onboarding-overlay" />

        <!-- Spotlight cutout (if target exists) -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
        >
          <div
            v-if="spotlightRect"
            class="absolute rounded-[10px] pointer-events-none onboarding-spotlight"
            :style="spotlightStyle"
          />
        </Transition>

        <!-- Tooltip card -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
          mode="out-in"
        >
          <div
            :key="currentStep"
            class="fixed z-[101] w-[min(320px,85vw)] rounded-[14px] p-5 shadow-2xl"
            style="background-color: var(--color-surface); border: 1px solid var(--color-border)"
            :style="tooltipStyle"
          >
            <!-- Step counter -->
            <div class="text-[11px] text-muted font-semibold mb-2 tracking-wide">
              {{ currentStep + 1 }}/{{ totalSteps }}
            </div>

            <h3 class="text-[16px] font-bold text-foreground mb-1.5">
              {{ step.title }}
            </h3>
            <p class="text-[14px] text-muted leading-relaxed mb-4">
              {{ step.text }}
            </p>

            <div class="flex items-center justify-between gap-3">
              <button
                class="text-[13px] text-muted hover:text-foreground transition-colors px-3 py-2"
                @click="skip"
              >
                Παράλειψη
              </button>
              <button
                class="btn-primary flex items-center gap-1.5 !px-4 !py-2.5 text-[13px]"
                @click="next"
              >
                {{ currentStep < totalSteps - 1 ? 'Επόμενο' : 'Ας ξεκινήσουμε!' }}
                <ChevronRight v-if="currentStep < totalSteps - 1" class="w-[14px] h-[14px]" />
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.onboarding-overlay {
  background: rgba(0, 0, 0, 0.65);
}

.onboarding-spotlight {
  box-shadow:
    0 0 0 9999px rgba(0, 0, 0, 0.65),
    0 0 20px 4px rgba(0, 0, 0, 0.25);
  background: transparent;
}
</style>
