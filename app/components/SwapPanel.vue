<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeftRight, Check, X, RotateCcw } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { useHaptics } from '~/composables/useHaptics'
import {
  DOCTOR_COLORS,
  DAY_NAMES,
  getDayOfWeek,
  getDayOfWeekMondayBased,
} from '~/utils/types'

const {
  doctors, month, year, schedule, daysInMonth,
  swapDays, showToast,
} = useAppState()

const haptics = useHaptics()

// Selection state
const firstDay = ref<number | null>(null)
const secondDay = ref<number | null>(null)

// Swap history for current session
interface SwapRecord {
  dayA: number
  dayB: number
  doctorA: string
  doctorB: string
  timestamp: number
}

const swapHistory = ref<SwapRecord[]>([])

function getDoctorForDay(dayIndex: number) {
  if (!schedule.value) return null
  const id = schedule.value[dayIndex]
  if (id == null) return null
  return doctors.value.find(d => d.id === id) ?? null
}

function isWeekend(dayIndex: number): boolean {
  const dow = getDayOfWeek(year.value, month.value, dayIndex + 1)
  return dow === 0 || dow === 6
}

function dayName(dayIndex: number): string {
  const dow = getDayOfWeekMondayBased(year.value, month.value, dayIndex + 1)
  return DAY_NAMES[dow] ?? ''
}

function selectDay(dayIndex: number) {
  if (!schedule.value) return

  if (firstDay.value === null) {
    firstDay.value = dayIndex
    haptics.light()
  } else if (secondDay.value === null) {
    if (dayIndex === firstDay.value) {
      // Deselect
      firstDay.value = null
      return
    }
    secondDay.value = dayIndex
    haptics.medium()
  } else {
    // Reset and start new selection
    firstDay.value = dayIndex
    secondDay.value = null
    haptics.light()
  }
}

function cancelSwap() {
  firstDay.value = null
  secondDay.value = null
}

function confirmSwap() {
  if (firstDay.value === null || secondDay.value === null) return

  const docA = getDoctorForDay(firstDay.value)
  const docB = getDoctorForDay(secondDay.value)

  swapHistory.value.unshift({
    dayA: firstDay.value,
    dayB: secondDay.value,
    doctorA: docA?.name ?? '—',
    doctorB: docB?.name ?? '—',
    timestamp: Date.now(),
  })

  swapDays(firstDay.value, secondDay.value)
  haptics.success()
  showToast(`Ανταλλαγή: Ημέρα ${firstDay.value + 1} ↔ Ημέρα ${secondDay.value + 1}`)

  firstDay.value = null
  secondDay.value = null
}

const previewA = computed(() => {
  if (firstDay.value === null || secondDay.value === null) return null
  return {
    day: firstDay.value,
    before: getDoctorForDay(firstDay.value),
    after: getDoctorForDay(secondDay.value),
  }
})

const previewB = computed(() => {
  if (firstDay.value === null || secondDay.value === null) return null
  return {
    day: secondDay.value,
    before: getDoctorForDay(secondDay.value),
    after: getDoctorForDay(firstDay.value),
  }
})

function isSelected(dayIndex: number): boolean {
  return dayIndex === firstDay.value || dayIndex === secondDay.value
}

function getRowBg(dayIndex: number): string {
  if (isSelected(dayIndex)) return 'var(--color-accent-soft, rgba(0,122,255,0.08))'
  if (isWeekend(dayIndex)) return 'var(--color-weekend-bg)'
  return 'var(--color-surface)'
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="space-y-4">
    <!-- Instructions -->
    <div class="card p-4">
      <div class="flex items-center gap-2 mb-2">
        <ArrowLeftRight class="w-[16px] h-[16px] text-accent" />
        <span class="text-[14px] font-semibold text-foreground">Ανταλλαγή εφημεριών</span>
      </div>
      <p class="text-[12px] text-muted">
        Πατήστε δύο ημέρες για να ανταλλάξετε τους γιατρούς τους.
      </p>
    </div>

    <!-- No schedule message -->
    <div v-if="!schedule" class="card p-8 text-center">
      <p class="text-muted text-[14px]">Δεν υπάρχει πρόγραμμα. Δημιουργήστε πρώτα από το Ημερολόγιο.</p>
    </div>

    <template v-else>
      <!-- Preview -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="previewA && previewB" class="card p-4 space-y-3">
          <div class="text-[13px] font-semibold text-foreground">Προεπισκόπηση ανταλλαγής</div>

          <div class="space-y-2">
            <div class="flex items-center gap-2 text-[13px]">
              <span class="font-medium text-foreground w-[60px]">Ημέρα {{ previewA.day + 1 }}:</span>
              <span
                v-if="previewA.before"
                class="chip"
                :style="{
                  backgroundColor: DOCTOR_COLORS[previewA.before.colorIndex] + '1A',
                  color: DOCTOR_COLORS[previewA.before.colorIndex],
                }"
              >{{ previewA.before.name }}</span>
              <span v-else class="text-muted">—</span>
              <span class="text-muted">→</span>
              <span
                v-if="previewA.after"
                class="chip"
                :style="{
                  backgroundColor: DOCTOR_COLORS[previewA.after.colorIndex] + '1A',
                  color: DOCTOR_COLORS[previewA.after.colorIndex],
                }"
              >{{ previewA.after.name }}</span>
              <span v-else class="text-muted">—</span>
            </div>

            <div class="flex items-center gap-2 text-[13px]">
              <span class="font-medium text-foreground w-[60px]">Ημέρα {{ previewB.day + 1 }}:</span>
              <span
                v-if="previewB.before"
                class="chip"
                :style="{
                  backgroundColor: DOCTOR_COLORS[previewB.before.colorIndex] + '1A',
                  color: DOCTOR_COLORS[previewB.before.colorIndex],
                }"
              >{{ previewB.before.name }}</span>
              <span v-else class="text-muted">—</span>
              <span class="text-muted">→</span>
              <span
                v-if="previewB.after"
                class="chip"
                :style="{
                  backgroundColor: DOCTOR_COLORS[previewB.after.colorIndex] + '1A',
                  color: DOCTOR_COLORS[previewB.after.colorIndex],
                }"
              >{{ previewB.after.name }}</span>
              <span v-else class="text-muted">—</span>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="flex-1 btn-secondary flex items-center justify-center gap-2 text-[14px]"
              @click="cancelSwap"
            >
              <X class="w-[16px] h-[16px]" />
              Ακύρωση
            </button>
            <button
              class="flex-1 btn-primary flex items-center justify-center gap-2 text-[14px]"
              @click="confirmSwap"
            >
              <Check class="w-[16px] h-[16px]" />
              Επιβεβαίωση
            </button>
          </div>
        </div>
      </Transition>

      <!-- Selection hint -->
      <div v-if="firstDay !== null && secondDay === null" class="card p-3 text-center">
        <p class="text-[12px] text-accent font-medium">
          Επιλέξτε τη δεύτερη ημέρα για ανταλλαγή (ημ. {{ firstDay + 1 }} επιλεγμένη)
        </p>
      </div>

      <!-- Day list -->
      <div class="space-y-1">
        <div
          v-for="i in daysInMonth"
          :key="i"
          class="flex items-center gap-3 px-4 py-3 rounded-[8px] transition-colors cursor-pointer
                 hover:bg-accent-soft active:scale-[0.99]"
          :class="{ 'ring-2 ring-accent': isSelected(i - 1) }"
          :style="{ backgroundColor: getRowBg(i - 1) }"
          @click="selectDay(i - 1)"
        >
          <div class="w-[48px] flex-shrink-0">
            <div
              class="text-[18px] font-semibold leading-none"
              :class="isWeekend(i - 1) ? 'text-weekend-text' : 'text-foreground'"
            >
              {{ i }}
            </div>
            <div class="text-[11px] font-medium mt-0.5"
                 :style="{ color: isWeekend(i - 1) ? 'var(--color-weekend-text)' : 'var(--color-text-secondary)' }">
              {{ dayName(i - 1) }}
            </div>
          </div>

          <div class="flex-1">
            <div
              v-if="getDoctorForDay(i - 1)"
              class="chip inline-flex"
              :style="{
                backgroundColor: DOCTOR_COLORS[getDoctorForDay(i - 1)!.colorIndex] + '1A',
                color: DOCTOR_COLORS[getDoctorForDay(i - 1)!.colorIndex],
              }"
            >
              {{ getDoctorForDay(i - 1)!.name }}
            </div>
            <span v-else class="text-[13px] text-muted">—</span>
          </div>

          <ArrowLeftRight
            v-if="isSelected(i - 1)"
            class="w-[16px] h-[16px] text-accent flex-shrink-0"
          />
        </div>
      </div>
    </template>

    <!-- Swap History -->
    <section v-if="swapHistory.length > 0">
      <h2 class="section-title mb-3 flex items-center gap-2">
        <RotateCcw class="w-[16px] h-[16px] text-muted" />
        Ιστορικό ανταλλαγών
      </h2>
      <div class="space-y-2">
        <div
          v-for="(swap, idx) in swapHistory"
          :key="idx"
          class="card px-4 py-3"
        >
          <div class="flex items-center gap-2 text-[13px]">
            <span class="text-muted">{{ formatTime(swap.timestamp) }}</span>
            <span class="font-medium text-foreground">Ημ. {{ swap.dayA + 1 }}</span>
            <span class="text-muted">({{ swap.doctorA }})</span>
            <ArrowLeftRight class="w-[12px] h-[12px] text-accent" />
            <span class="font-medium text-foreground">Ημ. {{ swap.dayB + 1 }}</span>
            <span class="text-muted">({{ swap.doctorB }})</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
